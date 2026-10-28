import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, defaultIfEmpty, map, of, switchMap, takeUntil } from 'rxjs';
import { MEASUREMENTS_REPOSITORY } from '../../core/services/measurements-repository';
import { ToastService } from '../../core/services/toast.service';
import { TenantLocaleService } from '../../core/services/tenant-locale.service';
import { CreateMeasurementDto, Measurement, MeasurementType, MeasurementsQuery } from '../../core/models/measurement.model';
import { EncounterVersionChange } from '../../core/models/encounter.model';
import { PagedResult } from '../../core/models/paged-result.model';
import {
  MEASUREMENTS_ACCESS_DENIED_MESSAGE, MEASUREMENTS_LOAD_ERROR_MESSAGE, MEASUREMENT_TYPES_LOAD_ERROR_MESSAGE,
  PATIENT_NOT_FOUND_MESSAGE, measurementError, measurementErrorField,
} from '../../shared/utils/measurements-error.util';
import { ENCOUNTER_NOT_FOUND_MESSAGE } from '../../shared/utils/encounters-error.util';
import { compareMeasurements, sortMeasurements } from './measurement-format.util';

// Qué mediciones muestra el store: las del paciente (pantalla "Signos vitales") o solo las de un
// encounter (sección del detalle).
export interface MeasurementsScope {
  patientId: string;
  encounterId: string | null;
}

type LoadKey = { patientId: string; query: MeasurementsQuery };
type LoadResult = { key: string; page: PagedResult<Measurement> } | { key: string; error: unknown };

export const DEFAULT_MEASUREMENTS_PAGE_SIZE = 10;
const EMPTY_RESPONSE = new Error('La fuente de datos completó sin responder.');

// Fase 4 T3/T4: estado de signos vitales. Se provee en el componente contenedor (vive y muere con
// la página/sección); los datos pasan por MEASUREMENTS_REPOSITORY (mock o HTTP).
//
// - Ámbito (paciente + encounter): cada setScope abre una "generación" nueva y corta lo que estaba
//   en vuelo (takeUntil(scopeChanged$)); una respuesta de un ámbito anterior se descarta entera:
//   ni saving, ni createdSeq, ni aviso, ni conflict$/encounterVersion$.
// - Cargas: switchMap por clave (paciente + encounter + tipo + página); además se descarta cualquier
//   respuesta cuya clave ya no es la actual. Un observable que completa sin emitir cuenta como error.
// - Alta: guarda de reentrada (una por vez, chequeada ANTES de construir el request). La medición
//   nueva se inserta en memoria (sin volver a pedir el listado), con el orden del backend
//   (measured_at desc, id asc) y sin duplicar por id, si cumple el filtro y cae en la página
//   mostrada; si cae en una página ANTERIOR, la actual se corre un lugar → se recarga. Si vino con
//   encounter, su nueva version sale por `encounterVersion$`.
// - Errores: 403 al leer → `accessDenied` (sin reintentar); 404 "Patient…" → `patientNotFound$`;
//   404 "Encounter…" → `encounterNotFound$`; 409 → aviso + `conflict$` (el detalle recarga el
//   encounter → la sección pasa a solo lectura); 403/422 al registrar → `actionError` (inline, en
//   español, números con el locale del tenant). 401: authInterceptor.
@Injectable()
export class MeasurementsStore {
  private repo = inject(MEASUREMENTS_REPOSITORY);
  private toast = inject(ToastService);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  readonly locale = inject(TenantLocaleService).locale;

  readonly items = signal<Measurement[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(DEFAULT_MEASUREMENTS_PAGE_SIZE);
  readonly typeFilter = signal('');
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  // 403/404 al listar: reintentar no cambia nada.
  readonly loadRetryable = signal(true);
  readonly accessDenied = signal(false);
  readonly saving = signal(false);
  readonly busy = computed(() => this.saving());
  readonly actionError = signal<string | null>(null);
  // 400/422 del alta que apunta a un campo del formulario (type, value, unit, measured_at, note): el
  // contenedor lo marca en su input (MeasurementForm.applyServerError) y, si pudo, limpia actionError.
  readonly fieldError = signal<{ field: string; message: string } | null>(null);
  // Se incrementa con cada alta exitosa: el formulario se limpia / el modal se cierra al verlo cambiar.
  readonly createdSeq = signal(0);

  readonly types = signal<MeasurementType[]>([]);
  readonly typesError = signal<string | null>(null);

  readonly conflict$ = new Subject<string>();
  readonly encounterNotFound$ = new Subject<string>();
  readonly patientNotFound$ = new Subject<string>();
  readonly encounterVersion$ = new Subject<EncounterVersionChange>();

  private scope: MeasurementsScope | null = null;
  private generation = 0;
  private readonly scopeChanged$ = new Subject<void>();
  private currentKey = '';
  private typesState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  private readonly load$ = new Subject<LoadKey>();

  constructor() {
    this.destroyRef.onDestroy(() => this.scopeChanged$.next());
    this.load$.pipe(
      switchMap(({ patientId, query }) => {
        const key = keyOf(patientId, query);
        return this.repo.list(patientId, query).pipe(
          map((page): LoadResult => ({ key, page })),
          defaultIfEmpty<LoadResult, LoadResult>({ key, error: EMPTY_RESPONSE }),
          catchError(error => of<LoadResult>({ key, error })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => this.onLoaded(result));
  }

  // Cambio de paciente/encounter mostrado (o null mientras no se sabe): limpia y carga.
  setScope(scope: MeasurementsScope | null, pageSize = this.pageSize()): void {
    if (sameScope(scope, this.scope) && pageSize === this.pageSize()) return;
    this.generation++;
    this.scopeChanged$.next();
    this.scope = scope;
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.typeFilter.set('');
    this.items.set([]);
    this.total.set(0);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.accessDenied.set(false);
    this.actionError.set(null);
    this.fieldError.set(null);
    this.saving.set(false);
    this.currentKey = '';
    if (!scope) {
      this.loading.set(false);
      return;
    }
    this.loadTypes();
    this.load();
  }

  setTypeFilter(type: string): void {
    const normalized = type.trim().toLowerCase();
    if (normalized === this.typeFilter()) return;
    this.typeFilter.set(normalized);
    this.page.set(1);
    this.load();
  }

  setPage(page: number): void {
    if (page < 1 || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  load(): void {
    const scope = this.scope;
    if (!isPlatformBrowser(this.platformId) || !scope) return;
    const query: MeasurementsQuery = {
      type: this.typeFilter() || undefined,
      encounter_id: scope.encounterId ?? undefined,
      page: this.page(),
      limit: this.pageSize(),
    };
    this.currentKey = keyOf(scope.patientId, query);
    this.loading.set(true);
    this.loadError.set(null);
    this.loadRetryable.set(true);
    this.load$.next({ patientId: scope.patientId, query });
  }

  // El catálogo es global: se pide una vez por store (y de nuevo si falló).
  loadTypes(): void {
    if (!isPlatformBrowser(this.platformId) || this.typesState === 'loading' || this.typesState === 'ready') return;
    this.typesState = 'loading';
    this.typesError.set(null);
    let received = false;
    this.repo.listTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: types => {
        received = true;
        this.typesState = 'ready';
        this.types.set(types);
      },
      error: () => this.failTypes(),
      complete: () => {
        if (!received) this.failTypes();
      },
    });
  }

  create(dto: CreateMeasurementDto): void {
    const scope = this.scope;
    if (!scope || this.saving()) return;
    const generation = this.generation;
    const current = () => generation === this.generation;
    let settled = false;
    this.saving.set(true);
    this.actionError.set(null);
    this.fieldError.set(null);
    this.repo.create(scope.patientId, dto).pipe(
      takeUntil(this.scopeChanged$),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ encounter_version, ...created }) => {
        settled = true;
        if (!current()) return;
        this.saving.set(false);
        this.insert(created);
        this.createdSeq.update(n => n + 1);
        if (created.encounter_id && encounter_version !== null) {
          this.encounterVersion$.next({ encounterId: created.encounter_id, version: encounter_version });
        }
        this.toast.success('Medición registrada.');
      },
      error: err => {
        settled = true;
        if (!current()) return;
        this.saving.set(false);
        this.handleCreateError(err, !!dto.encounter_id);
      },
      complete: () => {
        // Completó sin respuesta (y no por un cambio de ámbito): se libera y se avisa.
        if (settled || !current()) return;
        this.saving.set(false);
        this.actionError.set('No se pudo registrar la medición.');
      },
    });
  }

  private failTypes(): void {
    this.typesState = 'error';
    this.typesError.set(MEASUREMENT_TYPES_LOAD_ERROR_MESSAGE);
  }

  private onLoaded(result: LoadResult): void {
    if (result.key !== this.currentKey) return;
    this.loading.set(false);
    if ('page' in result) {
      this.items.set(sortMeasurements(result.page.items));
      this.total.set(result.page.total_count);
      return;
    }
    const { kind, message } = measurementError(result.error, {
      fallback: MEASUREMENTS_LOAD_ERROR_MESSAGE, locale: this.locale(),
    });
    switch (kind) {
      case 'unauthorized':
        return;
      case 'forbidden':
        this.loadRetryable.set(false);
        this.accessDenied.set(true);
        this.loadError.set(MEASUREMENTS_ACCESS_DENIED_MESSAGE);
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
      case 'validation':
        // Ej. filtro de tipo con formato inválido: reintentar igual no cambia nada.
        this.loadRetryable.set(false);
        this.loadError.set(message);
        return;
      default:
        this.loadError.set(message);
    }
  }

  private handleCreateError(err: unknown, encounterContext: boolean): void {
    const { kind, message } = measurementError(err, {
      fallback: 'No se pudo registrar la medición.', encounterContext, locale: this.locale(),
    });
    switch (kind) {
      case 'unauthorized':
        return;
      case 'conflict':
        this.actionError.set(message);
        this.conflict$.next(message);
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
        const field = measurementErrorField(err);
        this.fieldError.set(field ? { field, message } : null);
        return;
      }
      default:
        // forbidden, otros.
        this.actionError.set(message);
    }
  }

  // Inserta la medición nueva sin recargar, con el orden del backend y sin duplicar por id.
  private insert(created: Measurement): void {
    const scope = this.scope;
    if (!scope) return;
    const filter = this.typeFilter();
    if (filter && created.type !== filter) return;
    if (scope.encounterId && created.encounter_id !== scope.encounterId) return;

    const list = this.items();
    if (list.some(m => m.id === created.id)) return;
    this.total.update(n => n + 1);

    const size = this.pageSize();
    const first = list[0];
    const last = list[list.length - 1];
    // Va antes que la primera fila de una página > 1 → pertenece a una página anterior: toda la
    // página actual se corre un lugar, así que se pide de nuevo.
    if (this.page() > 1 && (!first || compareMeasurements(created, first) < 0)) {
      this.load();
      return;
    }
    // Página llena y va después de la última → pertenece a una página siguiente: esta no cambia.
    if (list.length >= size && last && compareMeasurements(created, last) > 0) return;
    this.items.set(sortMeasurements([created, ...list]).slice(0, size));
  }
}

function keyOf(patientId: string, query: MeasurementsQuery): string {
  return JSON.stringify([patientId, query.encounter_id ?? null, query.type ?? null, query.page, query.limit]);
}

function sameScope(a: MeasurementsScope | null, b: MeasurementsScope | null): boolean {
  return a === b || (!!a && !!b && a.patientId === b.patientId && a.encounterId === b.encounterId);
}
