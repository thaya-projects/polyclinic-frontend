import {
  ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { PrescriptionsStore } from '../prescriptions.store';
import { PrescriptionForm } from '../prescription-form/prescription-form';
import { PrescriptionItemRequest, PrescriptionsList } from '../prescriptions-list/prescriptions-list';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { PatientFichaTabs } from '../../patients/patient-ficha-tabs/patient-ficha-tabs';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import {
  CreatePrescriptionDto, PRESCRIPTION_LIMITS, Prescription, isWithinStandaloneItemWindow,
} from '../../../core/models/prescription.model';
import { PROFESSIONALS_LOAD_ERROR_MESSAGE } from '../../../shared/utils/encounters-error.util';
import {
  PATIENT_NOT_FOUND_MESSAGE, PRESCRIPTIONS_ACCESS_DENIED_MESSAGE, PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE,
  PRESCRIPTION_FORBIDDEN_MESSAGE, PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE, PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE,
  PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE,
} from '../../../shared/utils/prescriptions-error.util';

const PAGE_SIZE = 10;
// Cada cuánto se re-evalúa la pista de la ventana de 24 h de las recetas sueltas con la página abierta.
const CLOCK_TICK_MS = 60_000;

export const ENCOUNTER_STATUS_CHECKING_MESSAGE = 'Verificando el estado del encuentro…';
export const ENCOUNTER_STATUS_ERROR_MESSAGE = 'No se pudo verificar el estado del encuentro.';
export const PRESCRIPTION_MAX_ITEMS_REACHED_MESSAGE =
  `La receta alcanzó el máximo de ${PRESCRIPTION_LIMITS.maxItems} medicamentos.`;

// Fase 4 Recetas T4/T5: "Recetas" del paciente (/patients/:patientId/prescriptions). Contenedor: el
// estado vive en PrescriptionsStore (provisto acá) y los datos pasan por PRESCRIPTIONS_REPOSITORY.
// Listado paginado (issued_at desc) de todas las recetas, con y sin encuentro (las que tienen llevan
// link al encuentro). "Nueva receta suelta" en un modal (sin encuentro); la receta nueva aparece sin
// recargar.
//
// Acceso: el mismo que encuentros y signos vitales (profesional activo o clinical.void). El GET no
// sale hasta saberlo; sin acceso (o con 403 del backend) se muestra el aviso. Emitir: solo un
// profesional activo.
// "Agregar medicamento" (cálculo del cliente; el backend responde 409 igual y se maneja):
// habilitado solo si el usuario es el profesional (activo) que prescribió y, si tiene encuentro,
// este sigue open (se consulta su estado, solo para las recetas propias). En una receta suelta la
// ventana de 24 h NO deshabilita (el reloj del cliente puede estar adelantado): si según el reloj
// local ya venció se muestra una pista y el 409 del backend decide (ahí sí se bloquea).
// Errores: 404 del paciente → "Paciente no encontrado."; 409 de ventana/encuentro cerrado → mensaje y
// la receta queda bloqueada; otro 409 (concurrencia) → mensaje y se recarga la lista, sin bloquear;
// 403/422 → inline; 401 → authInterceptor.
@Component({
  selector: 'app-patient-prescriptions-page',
  imports: [PrescriptionsList, PrescriptionForm, Pagination, Modal, PatientFichaTabs],
  providers: [PrescriptionsStore],
  templateUrl: './patient-prescriptions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientPrescriptionsPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);
  readonly lookups = inject(EncounterLookupsService);
  readonly store = inject(PrescriptionsStore);

  readonly pageSize = PAGE_SIZE;
  readonly accessDeniedMessage = PRESCRIPTIONS_ACCESS_DENIED_MESSAGE;
  readonly patientNotFoundMessage = PATIENT_NOT_FOUND_MESSAGE;

  readonly patientId = signal('');
  readonly patientMissing = signal(false);
  readonly createOpen = signal(false);
  // Reloj para la pista de la ventana de 24 h (se actualiza cada minuto).
  readonly now = signal(Date.now());
  private readonly createForm = viewChild(PrescriptionForm);

  readonly patientName = computed(() => this.lookups.patientNameById()[this.patientId()] ?? '');

  // 403 del backend al leer (la sesión dice que puede, el backend no): mismo aviso que sin acceso.
  readonly accessView = computed(() => (this.store.accessDenied() ? 'denied' : this.lookups.encountersAccess()));

  readonly canCreate = computed(() => this.lookups.currentProfessional() !== null);
  // Motivo por el que "Nueva receta suelta" está deshabilitado (null = habilitado).
  readonly createDisabledReason = computed<string | null>(() => {
    switch (this.lookups.professionalsState()) {
      case 'idle':
      case 'loading': return 'Cargando…';
      case 'error': return PROFESSIONALS_LOAD_ERROR_MESSAGE;
    }
    const linked = this.lookups.linkedProfessional();
    if (!linked) return PRESCRIPTION_FORBIDDEN_MESSAGE;
    return linked.active ? null : PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE;
  });

  // "Agregar medicamento" por receta: null = habilitado; texto = motivo (deshabilitado).
  readonly addItemReasons = computed<Record<string, string | null>>(() => {
    const locked = this.store.lockedReasons();
    const statuses = this.store.encounterStatuses();
    const state = this.lookups.professionalsState();
    const linked = this.lookups.linkedProfessional();
    const reason = (p: Prescription): string | null => {
      if (state === 'idle' || state === 'loading') return 'Cargando…';
      if (state === 'error') return PROFESSIONALS_LOAD_ERROR_MESSAGE;
      if (!linked || linked.id !== p.professional_id) return PRESCRIPTION_ITEM_FORBIDDEN_MESSAGE;
      if (!linked.active) return PRESCRIPTION_INACTIVE_PROFESSIONAL_MESSAGE;
      if (locked[p.id]) return locked[p.id];
      if (p.items.length >= PRESCRIPTION_LIMITS.maxItems) return PRESCRIPTION_MAX_ITEMS_REACHED_MESSAGE;
      if (!p.encounter_id) return null;
      const status = statuses[p.encounter_id];
      if (status === undefined || status === 'loading') return ENCOUNTER_STATUS_CHECKING_MESSAGE;
      if (status === 'error') return ENCOUNTER_STATUS_ERROR_MESSAGE;
      return status === 'open' ? null : PRESCRIPTION_ENCOUNTER_CLOSED_MESSAGE;
    };
    return Object.fromEntries(this.store.items().map(p => [p.id, reason(p)]));
  });

  // Pista (no deshabilita) para las recetas sueltas habilitadas cuya ventana venció según el reloj local.
  readonly addItemHints = computed<Record<string, string>>(() => {
    const now = this.now();
    const reasons = this.addItemReasons();
    return Object.fromEntries(this.store.items()
      .filter(p => !p.encounter_id && reasons[p.id] === null && !isWithinStandaloneItemWindow(p.issued_at, now))
      .map(p => [p.id, PRESCRIPTION_WINDOW_LIKELY_CLOSED_MESSAGE]));
  });

  constructor() {
    inject(PageTitleService).set('Recetas');
    this.lookups.loadProfessionals();

    // 400/422 de un campo de "Nueva receta": se marca en su input; el banner queda para el resto.
    // También sigue a createForm(): si el error llega antes de que el form del modal exista.
    effect(() => {
      const error = this.store.actionFieldError();
      const form = this.createForm();
      if (!error || !form) return;
      untracked(() => {
        if (form.applyServerError(error.index, error.field, error.message)) this.store.actionError.set(null);
      });
    });

    if (isPlatformBrowser(this.platformId)) {
      const timer = setInterval(() => this.now.set(Date.now()), CLOCK_TICK_MS);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    }

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

    // Solo se consulta el estado de los encuentros de las recetas del profesional actual (activo).
    effect(() => {
      const owner = this.lookups.currentProfessional()?.id ?? null;
      untracked(() => this.store.setStatusOwner(owner));
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

  setPage(page: number): void {
    this.store.setPage(page);
  }

  goToFicha(): void {
    this.router.navigate(['/patients', this.patientId()]);
  }

  openCreate(): void {
    if (!this.canCreate() || this.store.busy()) return;
    this.store.actionError.set(null);
    this.store.actionFieldError.set(null);
    this.createOpen.set(true);
  }

  // Cancelar: el form se destruye con el modal (se pierden valores y errores).
  closeCreate(): void {
    if (this.store.busy()) return;
    this.createOpen.set(false);
    this.store.actionError.set(null);
    this.store.actionFieldError.set(null);
  }

  submitCreate(): void {
    this.createForm()?.submit();
  }

  onCreate(dto: CreatePrescriptionDto): void {
    if (!this.canCreate() || this.store.busy()) return;
    this.store.create(dto);
  }

  // La ventana de 24 h no se chequea acá (la decide el backend con su reloj).
  onAddItem(request: PrescriptionItemRequest): void {
    if (this.store.busy()) return;
    if (this.addItemReasons()[request.prescriptionId] !== null) return;
    this.store.addItem(request.prescriptionId, request.dto);
  }
}
