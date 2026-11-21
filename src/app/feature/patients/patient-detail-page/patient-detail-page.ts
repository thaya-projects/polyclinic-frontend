import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientDetail } from '../patient-detail/patient-detail';
import { CreatePatientForm } from '../create-patient-form/create-patient-form';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { PatientsService } from '../../../core/services/patients.service';
import { CreatePatientDto, Patient } from '../../../core/models/patient.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { patientDeactivateErrorMessage, patientDetailErrorMessage, patientSaveErrorMessage } from '../../../shared/utils/patients-error.util';

// Ficha del paciente como página propia (antes era un modal): es una VISTA, no un
// formulario — crear/editar sigue siendo modal, lanzado desde acá. Los accesos
// rápidos (Encuentros/Signos vitales/Recetas/Odontograma) viven en PatientFichaTabs,
// montado adentro de PatientDetail.
@Component({
  selector: 'app-patient-detail-page',
  imports: [PatientDetail, CreatePatientForm, Modal, ConfirmDialog, RouterLink],
  templateUrl: './patient-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDetailPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private patientsSvc = inject(PatientsService);
  private readonly editForm = viewChild<CreatePatientForm>('editForm');

  patient = signal<Patient | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);

  editOpen = signal(false);
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
    inject(PageTitleService).set('Paciente');
    const id = this.route.snapshot.paramMap.get('patientId')!;
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.patientsSvc.getById(id).subscribe({
      next: p => {
        this.patient.set(p);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set(patientDetailErrorMessage(err));
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/patients']);
  }

  openEdit(): void {
    this.actionError.set(null);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
    this.actionError.set(null);
  }

  onSaveEdit(dto: CreatePatientDto): void {
    const patient = this.patient();
    if (!patient) return;

    this.saving.set(true);
    this.actionError.set(null);
    this.patientsSvc.update(patient.id, dto).subscribe({
      next: updated => {
        this.saving.set(false);
        this.patient.set(updated);
        this.editOpen.set(false);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.editForm()?.applyServerError(err) ? null : patientSaveErrorMessage(err));
      },
    });
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
    this.patientsSvc.deactivate(patient.id).subscribe({
      next: updated => {
        this.deactivating.set(false);
        this.patientToDeactivate.set(null);
        this.patient.set(updated);
      },
      error: err => {
        this.deactivating.set(false);
        this.deactivateError.set(patientDeactivateErrorMessage(err));
      },
    });
  }
}
