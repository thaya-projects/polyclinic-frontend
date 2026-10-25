import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, defaultIfEmpty, map, of, switchMap, takeUntil } from 'rxjs';
import { PRESCRIPTIONS_REPOSITORY } from '../../core/services/prescriptions-repository';
import { ENCOUNTERS_REPOSITORY } from '../../core/services/encounters-repository';
import { ToastService } from '../../core/services/toast.service';
import { TenantLocaleService } from '../../core/services/tenant-locale.service';
import {
  CreatePrescriptionDto, CreatePrescriptionItemDto, CreatedPrescription, Prescription, PrescriptionItem,
} from '../../core/models/prescription.model';
import { EncounterStatus, EncounterVersionChange } from '../../core/models/encounter.model';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from '../../shared/utils/encounters-error.util';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTIONS_LOAD_ERROR_MESSAGE,
  PRESCRIPTION_CONFLICT_MESSAGE, PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE, PrescriptionFieldError, PrescriptionOperation,
  prescriptionError, prescriptionErrorField,
} from '../../shared/utils/prescriptions-error.util';
import { comparePrescriptionsAsc, comparePrescriptionsDesc } from './prescription-format.util';

// Qué recetas muestra el store: las del paciente (pantalla "Recetas", paginada, issued_at desc) o
// las de un encuentro (sección del detalle, sin paginación, issued_at asc).
export interface PrescriptionsScope {
  patientId: string;
  encounterId: string | null;
}

export type PrescriptionPendingAction = 'create' | 'item';

// Estado del encuentro de una receta (pantalla del paciente): para saber si admite ítems.
export type EncounterStatusLookup = EncounterStatus | 'loading' | 'error';

export interface PrescriptionItemError {
  prescriptionId: string;
  message: string;
  // 400/422 de un campo del ítem (medication, dose…): el listado lo marca en su input.
  field?: string;
}

// Por qué el backend bloqueó una receta: la ventana de 24 h (definitivo) o el encuentro cerrado
// (se libera si al recargar el encuentro vuelve a estar open).
type PrescriptionLock = { kind: 'window' | 'encounter'; reason: string };

type LoadResult = { key: string; items: Prescription[]; total: number } | { key: string; error: unknown };

export const DEFAULT_PRESCRIPTIONS_PAGE_SIZE = 10;
const EMPTY_RESPONSE = new Error('La fuente de datos completó sin responder.');

// Fase 4 Recetas T4/T5: estado de recetas. Se provee en el componente contenedor (vive y muere con
// la página/sección); los datos pasan por PRESCRIPTIONS_REPOSITORY (mock o HTTP).
//
// - Ámbito (paciente + encuentro): cada setScope abre una "generación" nueva y corta lo que estaba
//   en vuelo (takeUntil(scopeChanged$)); una respuesta de un ámbito anterior se descarta entera: ni
//   pending, ni createdSeq/itemAddedSeq, ni aviso, ni conflict$/encounterVersion$.
// - Cargas: switchMap por clave (paciente + encuentro + página); además se descarta cualquier
//   respuesta cuya clave ya no es la actual. Un observable que completa sin emitir cuenta como error.
// - Alta de receta / de ítem: guarda de reentrada (una operación por vez, chequeada ANTES de construir
//   el request). Lo nuevo se inserta en memoria (sin volver a pedir el listado), con el orden del
//   backend y sin duplicar por id. Si la receta es de un encuentro, su nueva version sale por
//   `encounterVersion$` (el detalle la aplica: si no, el próximo Guardar/Firmar daría un 409 falso).
// - Errores: 403 al leer → `accessDenied`; 404 "Patient…" → `patientNotFound$`; 404 "Encounter…" →
//   `encounterNotFound$`; 404 "Prescription…" (al agregar ítem) → aviso + se recarga la lista.
//   409 de encuentro no open → aviso + `conflict$` (el detalle recarga el encuentro → solo lectura) y
//   la receta queda bloqueada; 409 de la ventana de 24 h → aviso y "Agregar medicamento" se
//   deshabilita en ESA receta (`lockedReasons`). Cualquier otro 409 (concurrencia, índice único…) →
//   aviso para reintentar SIN bloquear: se recarga la lista y, en un encuentro, `concurrency$` (el
//   detalle recarga el encuentro → versión nueva). 403/422 → inline en español. 401: authInterceptor.
//   Los bloqueos por encuentro cerrado se liberan si el encuentro vuelve a leerse open
//   (`syncEncounterStatus`, también al reconsultar estados en la pantalla del paciente).
// - Pantalla del paciente: para las recetas con encuentro DEL PROFESIONAL ACTUAL (activo; ver
//   `setStatusOwner`) se consulta el estado de cada encuentro (ENCOUNTERS_REPOSITORY.getById, una vez
//   por id y ámbito) para habilitar "Agregar medicamento" solo si sigue open. Las recetas de otros
//   profesionales ya están deshabilitadas por permiso: no se consulta nada por ellas.
@Injectable()
export class PrescriptionsStore {
  private repo = inject(PRESCRIPTIONS_REPOSITORY);
  private encountersRepo = inject(ENCOUNTERS_REPOSITORY);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  readonly locale = inject(TenantLocaleService).locale;

  readonly items = signal<Prescription[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_PRESCRIPTIONS_PAGE_SIZE);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  // 403/404 al listar: reintentar no cambia nada.
  readonly loadRetryable = signal(true);
  readonly accessDenied = signal(false);

  readonly pending = signal<PrescriptionPendingAction | null>(null);
  readonly busy = computed(() => this.pending() !== null);
  readonly saving = computed(() => this.pending() === 'create');
  readonly addingItemTo = signal<string | null>(null);
  // Error del alta de receta (formulario "Nueva receta").
  readonly actionError = signal<string | null>(null);
  // 400/422 del alta que apunta a un campo del formulario (notes o items[i].campo): el contenedor lo
  // marca en su input (PrescriptionForm.applyServerError) y, si pudo, limpia actionError.
  readonly actionFieldError = signal<(PrescriptionFieldError & { message: string }) | null>(null);
  // Error del alta de un ítem, asociado a su receta.
  readonly itemError = signal<PrescriptionItemError | null>(null);
  // Se incrementan con cada alta exitosa: los formularios se limpian / el modal se cierra.
  readonly createdSeq = signal(0);
  readonly itemAddedSeq = signal(0);
  // Recetas en las que el backend respondió 409 (ventana o encuentro cerrado) → motivo para deshabilitar.
  private readonly locks = signal<Record<string, PrescriptionLock>>({});
  readonly lockedReasons = computed<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(this.locks()).map(([id, lock]) => [id, lock.reason])));
  readonly encounterStatuses = signal<Record<string, EncounterStatusLookup>>({});

  readonly conflict$ = new Subject<string>();
  // 409 de concurrencia en el ámbito de un encuentro: el contenedor recarga el encuentro (versión).
  readonly concurrency$ = new Subject<string>();
  readonly encounterNotFound$ = new Subject<string>();
  readonly patientNotFound$ = new Subject<string>();
  readonly encounterVersion$ = new Subject<EncounterVersionChange>();

  private scope: PrescriptionsScope | null = null;
  // Profesional (vinculado y activo) del usuario: solo sus recetas pueden recibir ítems.
  private statusOwner: string | null = null;
  private generation = 0;
  private readonly scopeChanged$ = new Subject<void>();
  private currentKey = '';
  private readonly load$ = new Subject<{ key: string; request: Observable<{ items: Prescription[]; total: number }> }>();

  constructor() {
    this.destroyRef.onDestroy(() => this.scopeChanged$.next());
    this.load$.pipe(
      switchMap(({ key, request }) => request.pipe(
        map((result): LoadResult => ({ key, ...result })),
        defaultIfEmpty<LoadResult, LoadResult>({ key, error: EMPTY_RESPONSE }),
        catchError(error => of<LoadResult>({ key, error })),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.onLoaded(result));
  }

  // Cambio de paciente/encuentro mostrado (o null mientras no se sabe): limpia y carga.
  setScope(scope: PrescriptionsScope | null, pageSize = this.pageSize()): void {
    if (sameScope(scope, this.scope) && pageSize === this.pageSize()) return;
    this.generation++;
    this.scopeChanged$.next();
    this.scope = scope;
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.items.set([]);
    this.total.set(0);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.accessDenied.set(false);
    this.actionError.set(null);
    this.actionFieldError.set(null);
    this.itemError.set(null);
    this.pending.set(null);
    this.addingItemTo.set(null);
    this.locks.set({});
    this.encounterStatuses.set({});
    this.currentKey = '';
    if (!scope) {
      this.loading.set(false);
      return;
    }
    this.load();
  }

  // Pantalla del paciente: id del profesional vinculado y activo (o null). Solo se consulta el estado
  // de los encuentros de SUS recetas.
  setStatusOwner(professionalId: string | null): void {
    if (professionalId === this.statusOwner) return;
    this.statusOwner = professionalId;
    if (this.scope && !this.scope.encounterId) this.loadEncounterStatuses(this.items());
  }

  // El encuentro se volvió a leer: si sigue open, los bloqueos por "encuentro cerrado" de sus recetas
  // quedaron viejos y se liberan.
  syncEncounterStatus(encounterId: string, status: EncounterStatus): void {
    if (status !== 'open') return;
    const ids = new Set(this.items().filter(p => p.encounter_id === encounterId).map(p => p.id));
    const locks = this.locks();
    const stale = Object.keys(locks).filter(id => locks[id].kind === 'encounter' && ids.has(id));
    if (stale.length === 0) return;
    this.locks.update(map => Object.fromEntries(Object.entries(map).filter(([id]) => !stale.includes(id))));
  }

  setPage(page: number): void {
    if (page < 1 || page === this.page() || this.scope?.encounterId) return;
    this.page.set(page);
    this.load();
  }

  load(): void {
    const scope = this.scope;
    if (!isPlatformBrowser(this.platformId) || !scope) return;
    const page = this.page();
    const limit = this.pageSize();
    const key = JSON.stringify([scope.patientId, scope.encounterId, scope.encounterId ? null : page, limit]);
    const request = scope.encounterId
      ? this.repo.listByEncounter(scope.encounterId).pipe(map(items => ({ items, total: items.length })))
      : this.repo.listByPatient(scope.patientId, { page, limit }).pipe(
        map(result => ({ items: result.items, total: result.total_count })));
    this.currentKey = key;
    this.loading.set(true);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.load$.next({ key, request });
  }

  // Receta en el encuentro del ámbito o, en la pantalla del paciente, suelta.
  create(dto: CreatePrescriptionDto): void {
    const scope = this.scope;
    if (!scope || this.pending()) return;
    const operation: PrescriptionOperation = scope.encounterId ? 'create_encounter' : 'create_standalone';
    const request$ = scope.encounterId
      ? this.repo.createForEncounter(scope.encounterId, dto)
      : this.repo.createStandalone(scope.patientId, dto);
    this.pending.set('create');
    this.actionError.set(null);
    this.actionFieldError.set(null);
    this.run(request$, {
      next: ({ encounter_version, ...created }: CreatedPrescription) => {
        this.insert(created);
        this.createdSeq.update(n => n + 1);
        if (created.encounter_id && encounter_version !== null) {
          this.encounterVersion$.next({ encounterId: created.encounter_id, version: encounter_version });
        }
        this.toast.success('Receta emitida.');
      },
      error: err => this.handleCreateError(err, operation),
      empty: () => this.actionError.set('No se pudo emitir la receta.'),
    });
  }

  addItem(prescriptionId: string, dto: CreatePrescriptionItemDto): void {
    const scope = this.scope;
    const prescription = this.items().find(p => p.id === prescriptionId);
    if (!scope || !prescription || this.pending()) return;
    this.pending.set('item');
    this.addingItemTo.set(prescriptionId);
    this.itemError.set(null);
    this.run(this.repo.addItem(prescriptionId, dto), {
      next: ({ encounter_version, ...item }) => {
        this.appendItem(prescriptionId, item);
        this.itemAddedSeq.update(n => n + 1);
        if (prescription.encounter_id && encounter_version !== null) {
          this.encounterVersion$.next({ encounterId: prescription.encounter_id, version: encounter_version });
        }
        this.toast.success('Medicamento agregado.');
      },
      error: err => this.handleItemError(err, prescription),
      empty: () => this.itemError.set({ prescriptionId, message: 'No se pudo agregar el medicamento.' }),
    });
  }

  // Corre una escritura del ámbito actual: libera pending al terminar y descarta lo que llega tarde.
  private run<T>(request$: Observable<T>, handlers: { next: (value: T) => void; error: (err: unknown) => void; empty: () => void }): void {
    const generation = this.generation;
    const current = () => generation === this.generation;
    let settled = false;
    const release = () => {
      this.pending.set(null);
      this.addingItemTo.set(null);
    };
    request$.pipe(takeUntil(this.scopeChanged$), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => {
        settled = true;
        if (!current()) return;
        release();
        handlers.next(value);
      },
      error: err => {
        settled = true;
        if (!current()) return;
        release();
        handlers.error(err);
      },
      complete: () => {
        // Completó sin respuesta (y no por un cambio de ámbito): se libera y se avisa.
        if (settled || !current()) return;
        release();
        handlers.empty();
      },
    });
  }

  private onLoaded(result: LoadResult): void {
    if (result.key !== this.currentKey) return;
    this.loading.set(false);
    if ('items' in result) {
      const scope = this.scope;
      this.items.set(sortFor(scope, result.items));
      this.total.set(result.total);
      if (scope && !scope.encounterId) this.loadEncounterStatuses(result.items);
      return;
    }
    const { kind, message } = prescriptionError(result.error, { fallback: PRESCRIPTIONS_LOAD_ERROR_MESSAGE });
    switch (kind) {
      case 'unauthorized':
        return;
      case 'forbidden':
        this.loadRetryable.set(false);
        this.accessDenied.set(true);
        this.loadError.set(PRESCRIPTIONS_ACCESS_DENIED_MESSAGE);
        return;
      case 'patient_not_found':
        this.loadRetryable.set(false);
        this.loadError.set(PATIENT_NOT_FOUND_MESSAGE);
        this.patientNotFound$.next(PATIENT_NOT_FOUND_MESSAGE);
        return;
      case 'not_found':
        this.loadRetryable.set(false);
        this.loadError.set(ENCOUNTER_NOT_FOUND_MESSAGE);
        this.encounterNotFound$.next(ENCOUNTER_NOT_FOUND_MESSAGE);
        return;
      default:
        this.loadError.set(message);
    }
  }

  // Estado de los encuentros de las recetas del profesional actual (una consulta por id y ámbito).
  private loadEncounterStatuses(list: Prescription[], force: string | null = null): void {
    const owner = this.statusOwner;
    if (!owner) return;
    const known = this.encounterStatuses();
    const ids = [...new Set(list.filter(p => p.professional_id === owner).map(p => p.encounter_id)
      .filter((id): id is string => !!id))]
      .filter(id => id === force || !known[id] || known[id] === 'error');
    if (ids.length === 0) return;
    const generation = this.generation;
    this.encounterStatuses.update(map => ({ ...map, ...Object.fromEntries(ids.map(id => [id, 'loading' as const])) }));
    for (const id of ids) {
      let received = false;
      const set = (status: EncounterStatusLookup) => {
        if (generation !== this.generation) return;
        this.encounterStatuses.update(map => ({ ...map, [id]: status }));
        if (status !== 'loading' && status !== 'error') this.syncEncounterStatus(id, status);
      };
      this.encountersRepo.getById(id).pipe(takeUntil(this.scopeChanged$), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: encounter => {
          received = true;
          set(encounter.status);
        },
        error: () => {
          received = true;
          set('error');
        },
        complete: () => {
          if (!received) set('error');
        },
      });
    }
  }

  private handleCreateError(err: unknown, operation: PrescriptionOperation): void {
    const { kind, message } = prescriptionError(err, { fallback: 'No se pudo emitir la receta.', operation });
    switch (kind) {
      case 'unauthorized':
        return;
      case 'conflict':
        this.actionError.set(message);
        this.conflict$.next(message);
        return;
      case 'concurrency':
        this.actionError.set(message);
        this.refreshAfterConcurrency(message);
        return;
      case 'not_found':
        this.actionError.set(message);
        this.encounterNotFound$.next(message);
        return;
      case 'patient_not_found':
        this.actionError.set(message);
        this.patientNotFound$.next(message);
        return;
      case 'validation': {
        this.actionError.set(message);
        const field = prescriptionErrorField(err);
        this.actionFieldError.set(field ? { ...field, message } : null);
        return;
      }
      default:
        // forbidden, otros.
        this.actionError.set(message);
    }
  }

  private handleItemError(err: unknown, prescription: Prescription): void {
    const { kind, message } = prescriptionError(err, {
      fallback: 'No se pudo agregar el medicamento.', operation: 'add_item',
    });
    const prescriptionId = prescription.id;
    switch (kind) {
      case 'unauthorized':
        return;
      case 'window_closed':
        this.lock(prescriptionId, 'window', message);
        this.itemError.set({ prescriptionId, message });
        return;
      case 'conflict': {
        // Encuentro firmado/anulado: la receta deja de admitir ítems. En el detalle, el contenedor
        // recarga el encuentro (→ solo lectura); en la pantalla del paciente se vuelve a consultar su estado.
        const inEncounterView = !!this.scope?.encounterId;
        this.lock(prescriptionId, 'encounter', PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE);
        this.itemError.set({ prescriptionId, message: inEncounterView ? PRESCRIPTION_CONFLICT_MESSAGE : message });
        if (!inEncounterView && prescription.encounter_id) this.loadEncounterStatuses([prescription], prescription.encounter_id);
        this.conflict$.next(message);
        return;
      }
      case 'concurrency':
        // No se bloquea: el formulario sigue abierto con lo escrito para reintentar.
        this.itemError.set({ prescriptionId, message });
        this.refreshAfterConcurrency(message);
        return;
      case 'prescription_not_found':
        // La receta desaparece al recargar (y con ella su error inline): el aviso va por toast.
        this.toast.error(message);
        this.load();
        return;
      case 'not_found':
        this.itemError.set({ prescriptionId, message });
        this.encounterNotFound$.next(message);
        return;
      case 'patient_not_found':
        this.itemError.set({ prescriptionId, message });
        this.patientNotFound$.next(message);
        return;
      case 'validation': {
        const field = prescriptionErrorField(err)?.field;
        this.itemError.set(field ? { prescriptionId, message, field } : { prescriptionId, message });
        return;
      }
      default:
        // forbidden, otros.
        this.itemError.set({ prescriptionId, message });
    }
  }

  private lock(prescriptionId: string, kind: PrescriptionLock['kind'], reason: string): void {
    this.locks.update(map => ({ ...map, [prescriptionId]: { kind, reason } }));
  }

  // 409 de concurrencia: se vuelven a pedir los datos (la lista; en un encuentro además su versión).
  private refreshAfterConcurrency(message: string): void {
    this.load();
    if (this.scope?.encounterId) this.concurrency$.next(message);
  }

  // Ítem nuevo al final de su receta, sin recargar y sin duplicar por id.
  private appendItem(prescriptionId: string, item: PrescriptionItem): void {
    this.items.update(list => list.map(p => {
      if (p.id !== prescriptionId || p.items.some(i => i.id === item.id)) return p;
      return { ...p, items: [...p.items, item] };
    }));
  }

  // Inserta la receta nueva sin recargar, con el orden del backend y sin duplicar por id.
  private insert(created: Prescription): void {
    const scope = this.scope;
    if (!scope) return;
    if (scope.encounterId && created.encounter_id !== scope.encounterId) return;
    if (created.patient_id && created.patient_id !== scope.patientId) return;
    const list = this.items();
    if (list.some(p => p.id === created.id)) return;
    this.total.update(n => n + 1);

    if (scope.encounterId) {
      this.items.set([...list, created].sort(comparePrescriptionsAsc));
      return;
    }
    const size = this.pageSize();
    const last = list[list.length - 1];
    // Desde una página > 1 se vuelve a la 1 (ahí aparece la receta recién emitida).
    if (this.page() > 1) {
      this.page.set(1);
      this.load();
      return;
    }
    // Página llena y va después de la última → pertenece a una página siguiente: esta no cambia.
    if (list.length >= size && last && comparePrescriptionsDesc(created, last) > 0) return;
    this.items.set([created, ...list].sort(comparePrescriptionsDesc).slice(0, size));
  }
}

function sortFor(scope: PrescriptionsScope | null, list: Prescription[]): Prescription[] {
  return [...list].sort(scope?.encounterId ? comparePrescriptionsAsc : comparePrescriptionsDesc);
}

function sameScope(a: PrescriptionsScope | null, b: PrescriptionsScope | null): boolean {
  return a === b || (!!a && !!b && a.patientId === b.patientId && a.encounterId === b.encounterId);
}
