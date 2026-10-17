import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { ENCOUNTERS_REPOSITORY } from '../../../core/services/encounters-repository';
import { CIE10_CATALOG } from '../../../core/services/cie10-catalog';
import { ToastService } from '../../../core/services/toast.service';
import { Cie10Entry, CreateDiagnosisDto, Diagnosis } from '../../../core/models/diagnosis.model';
import { EncounterVersionChange } from '../../../core/models/encounter.model';
import {
  DIAGNOSES_ACCESS_DENIED_MESSAGE, DIAGNOSES_LOAD_ERROR_MESSAGE, DIAGNOSES_NOT_FOUND_MESSAGE, diagnosisError,
} from '../../../shared/utils/encounters-error.util';

export type DiagnosisPendingAction = 'create' | 'delete';

type LoadResult = { id: string; diagnoses: Diagnosis[] } | { id: string; error: unknown };

// Fase 4 T4/T5: estado de los diagnósticos del encounter mostrado. Se provee en el detalle
// (providers del componente: vive y muere con la página). Los diagnósticos pasan por
// ENCOUNTERS_REPOSITORY y el buscador por CIE10_CATALOG (mock o HTTP).
//
// - Cargas: switchMap por id; además se descarta cualquier respuesta cuyo id ya no es el mostrado.
// - Alta/baja: guarda de reentrada (una operación por vez, chequeada ANTES de construir el request);
//   la lista se actualiza con la respuesta, sin recargar, y la nueva version del encounter sale por
//   `encounterVersion$` (si el detalle no la aplica, el próximo Guardar/Firmar daría un 409 falso).
// - Errores: 403/422 → `actionError` (inline, en español). 409 por código repetido → solo el aviso.
//   409 de estado (encounter firmado/anulado) → aviso + `conflict$` (el contenedor recarga el
//   encounter y la sección pasa a solo lectura). 404 "Diagnosis…" → se saca de la lista y se avisa;
//   404 "Encounter…" → `encounterNotFound$` (el contenedor vuelve al listado). 401: authInterceptor.
@Injectable()
export class EncounterDiagnosesStore {
  private repo = inject(ENCOUNTERS_REPOSITORY);
  private catalog = inject(CIE10_CATALOG);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  readonly diagnoses = signal<Diagnosis[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  // 403/404 al listar: reintentar no cambia nada.
  readonly loadRetryable = signal(true);
  readonly pending = signal<DiagnosisPendingAction | null>(null);
  readonly busy = computed(() => this.pending() !== null);
  readonly deletingId = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  // Se incrementa con cada alta exitosa: la sección limpia su formulario al verlo cambiar.
  readonly createdSeq = signal(0);

  readonly conflict$ = new Subject<string>();
  readonly encounterNotFound$ = new Subject<string>();
  readonly encounterVersion$ = new Subject<EncounterVersionChange>();

  // Para el buscador de la sección (presentacional): solo conoce esta función.
  readonly searchCie10 = (q: string): Observable<Cie10Entry[]> => this.catalog.search(q);

  private encounterId: string | null = null;
  private readonly load$ = new Subject<string>();

  constructor() {
    this.load$.pipe(
      switchMap(id => this.repo.listDiagnoses(id).pipe(
        map((diagnoses): LoadResult => ({ id, diagnoses })),
        catchError(error => of<LoadResult>({ id, error })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.onLoaded(result));
  }

  // Cambio de encounter mostrado (o null mientras carga otro): limpia y carga sus diagnósticos.
  setEncounter(id: string | null): void {
    if (id === this.encounterId) return;
    this.encounterId = id;
    this.diagnoses.set([]);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.actionError.set(null);
    this.pending.set(null);
    this.deletingId.set(null);
    if (id) this.load();
    else this.loading.set(false);
  }

  load(): void {
    if (!isPlatformBrowser(this.platformId) || !this.encounterId) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.load$.next(this.encounterId);
  }

  create(dto: CreateDiagnosisDto): void {
    const id = this.encounterId;
    if (!id || this.pending()) return;
    this.pending.set('create');
    this.actionError.set(null);
    this.repo.createDiagnosis(id, dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ encounter_version, ...created }) => {
        if (id !== this.encounterId) return;
        this.pending.set(null);
        this.diagnoses.update(list => [...list, created]);
        this.createdSeq.update(n => n + 1);
        this.encounterVersion$.next({ encounterId: id, version: encounter_version });
        this.toast.success('Diagnóstico agregado.');
      },
      error: err => {
        if (id !== this.encounterId) return;
        this.pending.set(null);
        this.handleActionError(err, 'create');
      },
    });
  }

  remove(diagnosisId: string): void {
    const id = this.encounterId;
    if (!id || this.pending()) return;
    this.pending.set('delete');
    this.deletingId.set(diagnosisId);
    this.actionError.set(null);
    this.repo.deleteDiagnosis(id, diagnosisId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ encounter_version }) => {
        if (id !== this.encounterId) return;
        this.endDelete();
        this.drop(diagnosisId);
        this.encounterVersion$.next({ encounterId: id, version: encounter_version });
        this.toast.success('Diagnóstico eliminado.');
      },
      error: err => {
        if (id !== this.encounterId) return;
        this.endDelete();
        this.handleActionError(err, 'delete', diagnosisId);
      },
    });
  }

  private onLoaded(result: LoadResult): void {
    if (result.id !== this.encounterId) return;
    this.loading.set(false);
    if ('diagnoses' in result) {
      this.diagnoses.set(result.diagnoses);
      return;
    }
    const { kind, message } = diagnosisError(result.error, DIAGNOSES_LOAD_ERROR_MESSAGE);
    switch (kind) {
      case 'unauthorized':
        return;
      case 'forbidden':
        this.loadRetryable.set(false);
        this.loadError.set(DIAGNOSES_ACCESS_DENIED_MESSAGE);
        return;
      case 'not_found':
      case 'diagnosis_not_found':
        this.loadRetryable.set(false);
        this.loadError.set(DIAGNOSES_NOT_FOUND_MESSAGE);
        return;
      default:
        this.loadError.set(message);
    }
  }

  private handleActionError(err: unknown, action: DiagnosisPendingAction, diagnosisId?: string): void {
    const { kind, message } = diagnosisError(err, action === 'create'
      ? 'No se pudo agregar el diagnóstico.'
      : 'No se pudo eliminar el diagnóstico.');
    switch (kind) {
      case 'unauthorized':
        return;
      case 'conflict':
        this.actionError.set(message);
        this.conflict$.next(message);
        this.load();
        return;
      case 'not_found':
        this.encounterNotFound$.next(message);
        return;
      case 'diagnosis_not_found':
        // Otro usuario/pestaña ya lo borró: se refleja en la lista.
        if (diagnosisId) this.drop(diagnosisId);
        this.actionError.set(message);
        return;
      default:
        // duplicate_code, forbidden, validation, otros.
        this.actionError.set(message);
    }
  }

  private endDelete(): void {
    this.pending.set(null);
    this.deletingId.set(null);
  }

  private drop(diagnosisId: string): void {
    this.diagnoses.update(list => list.filter(d => d.id !== diagnosisId));
  }
}
