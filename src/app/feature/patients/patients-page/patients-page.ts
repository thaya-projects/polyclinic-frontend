import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PatientsTable } from '../patients-table/patients-table';
import { CreatePatientForm } from '../create-patient-form/create-patient-form';
import { PatientDetail } from '../patient-detail/patient-detail';
import { ListFilters } from '../../../shared/components/list-filters/list-filters';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PatientsService } from '../../../core/services/patients.service';
import { CreatePatientDto, Patient, PatientsQuery } from '../../../core/models/patient.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { EncounterLookupsService } from '../../../core/services/encounter-lookups.service';
import { patientDeactivateErrorMessage, patientSaveErrorMessage } from '../../../shared/utils/patients-error.util';

const PAGE_SIZE = 8;

type ModalMode = 'none' | 'create' | 'detail' | 'edit';

@Component({
  selector: 'app-patients-page',
  imports: [PatientsTable, CreatePatientForm, PatientDetail, ListFilters, Pagination, Modal, ConfirmDialog],
  templateUrl: './patients-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientsPage {
  private patientsSvc = inject(PatientsService);
  private router = inject(Router);
  private encounterLookups = inject(EncounterLookupsService);

  // Fase 4: los botones de encuentros solo existen para quien puede leerlos (profesional activo o
  // clinical.void); sin acceso se ocultan. Mientras se verifica (o si falló) quedan deshabilitados.
  readonly encountersAccess = this.encounterLookups.encountersAccess;
  readonly showEncounterButtons = computed(() => this.encountersAccess() !== 'denied');
  readonly encountersButtonDisabledReason = computed(() => {
    switch (this.encountersAccess()) {
      case 'loading': return 'Cargando…';
      case 'error': return this.encounterLookups.professionalsError() ?? 'No se pudo verificar el acceso.';
      default: return null;
    }
  });

  // "Nueva nota" solo para el usuario vinculado a un profesional habilitado (el backend da 403 si no).
  // Motivo por el que "Nueva nota" está deshabilitada para ese paciente (null = habilitada):
  // paciente inactivo, o el usuario sin profesional habilitado (cargando/error/sin vínculo/desactivado).
  newEncounterDisabledReason(patient: Patient): string | null {
    if (!patient.is_active) return 'Paciente inactivo';
    return this.encountersButtonDisabledReason() ?? this.encounterLookups.createDisabledReason();
  }

  readonly patients = this.patientsSvc.getAll();
  readonly total = this.patientsSvc.total;
  readonly listLoading = this.patientsSvc.loading;
  readonly listError = this.patientsSvc.error;

  readonly pageSize = PAGE_SIZE;

  search = signal('');
  page = signal(1);

  modalMode = signal<ModalMode>('none');
  selectedPatient = signal<Patient | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  patientToDeactivate = signal<Patient | null>(null);
  deactivating = signal(false);
  deactivateError = signal<string | null>(null);

  readonly deactivateMessage = computed(() => {
    const err = this.deactivateError();
    if (err) return err;
    const patient = this.patientToDeactivate();
    return patient
      ? `¿Seguro que querés desactivar a "${patient.first_name} ${patient.last_name}"? Ya no va a poder ser agendado hasta reactivarlo.`
      : '';
  });

  constructor() {
    inject(PageTitleService).set('Pacientes');
    this.encounterLookups.loadProfessionals();

    // Vuelve a la página 1 cada vez que cambia la búsqueda.
    effect(() => {
      this.search();
      this.page.set(1);
    });

    // GET /tenants/patients — se vuelve a pedir cada vez que cambia la
    // búsqueda o la página (server-side, T7).
    effect(() => {
      this.reload();
    });
  }

  // El buscador es uno solo (T6: "por nombre o documento"); se manda el
  // mismo término como `q` y como `document` — cualquiera de los dos que
  // matchee del lado del backend alcanza para encontrar al paciente.
  private currentQuery(): PatientsQuery {
    const term = this.search().trim();
    return {
      q: term || undefined,
      document: term || undefined,
      page: this.page(),
      limit: this.pageSize,
    };
  }

  private reload(): void {
    this.patientsSvc.load(this.currentQuery());
  }

  openCreateModal(): void {
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openDetail(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.actionError.set(null);
    this.modalMode.set('detail');
  }

  openEdit(): void {
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  backToDetail(): void {
    this.actionError.set(null);
    this.modalMode.set('detail');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedPatient.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreatePatientDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.patientsSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.page.set(1);
        this.reload();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(patientSaveErrorMessage(err));
      },
    });
  }

  onSaveEdit(dto: CreatePatientDto): void {
    const patient = this.selectedPatient();
    if (!patient) return;

    this.saving.set(true);
    this.actionError.set(null);
    this.patientsSvc.update(patient.id, dto).subscribe({
      next: updated => {
        this.saving.set(false);
        this.selectedPatient.set(updated);
        this.modalMode.set('detail');
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(patientSaveErrorMessage(err));
      },
    });
  }

  // Fase 4 T6: encuentros del paciente. Cierra el modal antes de navegar (libera el scroll lock).
  goToEncounters(patient: Patient, create = false): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    if (create && this.newEncounterDisabledReason(patient)) return;
    this.closeModal();
    this.router.navigate(['/encounters'], {
      queryParams: create ? { patient_id: patient.id, new: 1 } : { patient_id: patient.id },
    });
  }

  // Fase 4 T3: signos vitales del paciente. Mismo acceso que "Encuentros".
  goToMeasurements(patient: Patient): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    this.closeModal();
    this.router.navigate(['/patients', patient.id, 'measurements']);
  }

  // Fase 4 Recetas T4: recetas del paciente. Mismo acceso que "Encuentros" y "Signos vitales".
  goToPrescriptions(patient: Patient): void {
    if (this.encountersButtonDisabledReason() || !this.showEncounterButtons()) return;
    this.closeModal();
    this.router.navigate(['/patients', patient.id, 'prescriptions']);
  }

  requestDeactivate(patient: Patient): void {
    this.patientToDeactivate.set(patient);
    this.deactivateError.set(null);
  }

  cancelDeactivate(): void {
    this.patientToDeactivate.set(null);
    this.deactivateError.set(null);
  }

  confirmDeactivate(): void {
    const patient = this.patientToDeactivate();
    if (!patient) return;

    this.deactivating.set(true);
    this.deactivateError.set(null);
    // Actualiza solo ese registro en memoria (PatientsService.upsertLocal),
    // sin recargar todo el listado — criterio de aceptación de T7.
    this.patientsSvc.deactivate(patient.id).subscribe({
      next: updated => {
        this.deactivating.set(false);
        this.patientToDeactivate.set(null);
        if (this.selectedPatient()?.id === updated.id) this.selectedPatient.set(updated);
      },
      error: err => {
        this.deactivating.set(false);
        this.deactivateError.set(patientDeactivateErrorMessage(err));
      },
    });
  }
}
