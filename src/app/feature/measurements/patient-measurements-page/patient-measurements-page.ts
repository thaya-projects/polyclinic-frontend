import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MeasurementsTable } from '../measurements-table/measurements-table';
import { MeasurementForm, OTHER_MEASUREMENT_TYPE } from '../measurement-form/measurement-form';
import { MeasurementsStore } from '../measurements.store';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import {
  CUSTOM_MEASUREMENT_TYPE_PATTERN, CreateMeasurementDto, measurementTypeLabel,
} from '../../../core/models/measurement.model';
import { INPUT_BASE_CLASS } from '../../../shared/utils/form-validation.util';
import { PROFESSIONALS_LOAD_ERROR_MESSAGE } from '../../../shared/utils/encounters-error.util';
import {
  MEASUREMENTS_ACCESS_DENIED_MESSAGE, MEASUREMENT_FORBIDDEN_MESSAGE, MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE,
  MEASUREMENT_TYPE_FORMAT_MESSAGE, PATIENT_NOT_FOUND_MESSAGE,
} from '../../../shared/utils/measurements-error.util';

const PAGE_SIZE = 10;

// Fase 4 T3/T4: "Signos vitales" del paciente (/patients/:patientId/measurements). Contenedor: el
// estado vive en MeasurementsStore (provisto acá) y los datos pasan por MEASUREMENTS_REPOSITORY.
// Listado measured_at desc con filtro por tipo y paginación server-side; alta en un modal — la
// medición nueva aparece en la lista sin recargar.
//
// Acceso: el mismo que encuentros (policy ClinicalRead): profesional activo o clinical.void. El GET
// no sale hasta saberlo; sin acceso (o con 403 del backend) se muestra el aviso. Registrar: solo un
// profesional activo (clinical.void sin profesional solo lee).
// Errores: 404 del paciente → "Paciente no encontrado."; 403/422 al registrar → inline en el modal;
// 401 → authInterceptor.
// El formulario existe SOLO con el modal abierto (@if): cada apertura arranca limpio y con la fecha
// "ahora"; cancelar lo destruye junto con sus errores.
// Filtro por tipo: catálogo + "Otro…" con un código libre (los tipos libres también se filtran).
@Component({
  selector: 'app-patient-measurements-page',
  imports: [MeasurementsTable, MeasurementForm, Pagination, Modal, RouterLink],
  providers: [MeasurementsStore],
  templateUrl: './patient-measurements-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientMeasurementsPage {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  readonly lookups = inject(EncounterLookupsService);
  readonly store = inject(MeasurementsStore);

  readonly pageSize = PAGE_SIZE;
  readonly selectClass = `${INPUT_BASE_CLASS} border-border focus:border-brand focus:ring-brand/18`;
  readonly typeLabel = measurementTypeLabel;
  readonly accessDeniedMessage = MEASUREMENTS_ACCESS_DENIED_MESSAGE;

  readonly patientId = signal('');
  readonly patientMissing = signal(false);
  readonly patientNotFoundMessage = PATIENT_NOT_FOUND_MESSAGE;
  createOpen = signal(false);
  private readonly createForm = viewChild(MeasurementForm);

  readonly otherFilter = OTHER_MEASUREMENT_TYPE;
  // Opción elegida en el select del filtro ('' = todos, un tipo del catálogo u "Otro…").
  readonly filterOption = signal('');
  readonly customFilterError = signal<string | null>(null);

  readonly patientName = computed(() => this.lookups.patientNameById()[this.patientId()] ?? '');

  // 403 del backend al leer (la sesión dice que puede, el backend no): mismo aviso que sin acceso.
  readonly accessView = computed(() => (this.store.accessDenied() ? 'denied' : this.lookups.encountersAccess()));

  readonly canRegister = computed(() => this.lookups.currentProfessional() !== null);
  // Motivo por el que "Registrar medición" está deshabilitado (null = habilitado).
  readonly registerDisabledReason = computed<string | null>(() => {
    switch (this.lookups.professionalsState()) {
      case 'idle':
      case 'loading': return 'Cargando…';
      case 'error': return PROFESSIONALS_LOAD_ERROR_MESSAGE;
    }
    const linked = this.lookups.linkedProfessional();
    if (!linked) return MEASUREMENT_FORBIDDEN_MESSAGE;
    return linked.active ? null : MEASUREMENT_INACTIVE_PROFESSIONAL_MESSAGE;
  });

  constructor() {
    inject(PageTitleService).set('Signos vitales');
    this.lookups.loadProfessionals();

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.patientId.set(params.get('patientId') ?? '');
      this.patientMissing.set(false);
      this.createOpen.set(false);
    });

    effect(() => {
      const id = this.patientId();
      untracked(() => this.lookups.ensurePatients([id]));
    });

    // El GET sale recién cuando se sabe que el usuario tiene acceso (una vez por paciente).
    effect(() => {
      const id = this.patientId();
      const allowed = this.lookups.encountersAccess() === 'allowed';
      untracked(() => this.store.setScope(id && allowed ? { patientId: id, encounterId: null } : null, PAGE_SIZE));
    });

    this.store.patientNotFound$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.createOpen.set(false);
      this.patientMissing.set(true);
    });

    // Alta exitosa → cierra el modal (la lista ya se actualizó en memoria).
    let lastSeq: number | null = null;
    effect(() => {
      const seq = this.store.createdSeq();
      if (lastSeq !== null && seq !== lastSeq) untracked(() => this.createOpen.set(false));
      lastSeq = seq;
    });
  }

  // Si el filtro activo es un tipo libre, el select muestra "Otro…" con el código en el input.
  readonly selectedFilterOption = computed(() => {
    const filter = this.store.typeFilter();
    if (this.filterOption() === OTHER_MEASUREMENT_TYPE) return OTHER_MEASUREMENT_TYPE;
    if (!filter || this.store.types().some(t => t.type === filter)) return filter;
    return OTHER_MEASUREMENT_TYPE;
  });

  onFilterSelect(value: string): void {
    this.customFilterError.set(null);
    this.filterOption.set(value);
    if (value !== OTHER_MEASUREMENT_TYPE) this.store.setTypeFilter(value);
  }

  // Código libre: mismo formato que el backend (si no, 422) — se valida antes de pedir.
  applyCustomFilter(code: string): void {
    const normalized = code.trim().toLowerCase();
    if (!normalized) {
      this.customFilterError.set(null);
      this.store.setTypeFilter('');
      return;
    }
    if (!CUSTOM_MEASUREMENT_TYPE_PATTERN.test(normalized)) {
      this.customFilterError.set(MEASUREMENT_TYPE_FORMAT_MESSAGE);
      return;
    }
    this.customFilterError.set(null);
    this.store.setTypeFilter(normalized);
  }

  clearTypeFilter(): void {
    this.filterOption.set('');
    this.customFilterError.set(null);
    this.store.setTypeFilter('');
  }

  setTypeFilter(value: string): void {
    this.onFilterSelect(value);
  }

  setPage(page: number): void {
    this.store.setPage(page);
  }

  openCreate(): void {
    if (!this.canRegister() || this.store.busy()) return;
    this.store.actionError.set(null);
    this.store.loadTypes();
    this.createOpen.set(true);
  }

  // Cancelar: el form se destruye con el modal (se pierden valores y errores).
  closeCreate(): void {
    if (this.store.busy()) return;
    this.createOpen.set(false);
    this.store.actionError.set(null);
  }

  submitCreate(): void {
    this.createForm()?.submit();
  }

  onCreate(dto: CreateMeasurementDto): void {
    if (!this.canRegister() || this.store.busy()) return;
    this.store.create(dto);
  }
}
