import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { SpecialtiesTable } from '../specialties-table/specialties-table';
import { SpecialtyForm } from '../specialty-form/specialty-form';
import { Modal } from '../../../../shared/components/modal/modal';
import { SpecialtiesService } from '../../../../core/services/specialties.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { CreateSpecialtyDto, Specialty, UpdateSpecialtyDto } from '../../../../core/models/specialty.model';
import { clinicSettingsErrorMessage } from '../../../../shared/utils/clinic-settings-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-specialties-page',
  imports: [SpecialtiesTable, SpecialtyForm, Modal],
  templateUrl: './specialties-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtiesPage {
  private specialtiesSvc = inject(SpecialtiesService);
  private allSpecialties = this.specialtiesSvc.getAll();

  readonly listLoading = this.specialtiesSvc.loading;
  readonly listError = this.specialtiesSvc.error;
  readonly specialties = computed(() => this.allSpecialties());

  modalMode = signal<ModalMode>('none');
  selectedSpecialty = signal<Specialty | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  private createForm = viewChild<SpecialtyForm>('createForm');
  private editForm = viewChild<SpecialtyForm>('editForm');

  toggling = signal<string | null>(null);
  toggleError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Especialidades');
    this.specialtiesSvc.load();
  }

  openCreateModal(): void {
    this.selectedSpecialty.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(specialty: Specialty): void {
    // Globales no editables — el backend rechazaría con 403, la tabla ya oculta el botón.
    if (!specialty.tenant_id) return;
    this.selectedSpecialty.set(specialty);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedSpecialty.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreateSpecialtyDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.specialtiesSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const form = this.createForm();
        if (form && err instanceof HttpErrorResponse && err.status === 409) {
          form.markCodeTaken();
          this.actionError.set(null);
          return;
        }
        // Error de un campo → debajo del input; si no, banner con el motivo.
        this.actionError.set(form?.applyServerError(err)
          ? null
          : clinicSettingsErrorMessage(err, 'No se pudo crear la especialidad.', 'La especialidad ya no existe.'));
      },
    });
  }

  onSaveEdit(dto: UpdateSpecialtyDto): void {
    const specialty = this.selectedSpecialty();
    if (!specialty) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.specialtiesSvc.update(specialty.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(this.editForm()?.applyServerError(err)
          ? null
          : clinicSettingsErrorMessage(err, 'No se pudo guardar la especialidad.', 'La especialidad ya no existe.'));
      },
    });
  }

  onToggleActive(specialty: Specialty): void {
    if (!specialty.tenant_id) return;
    this.toggling.set(specialty.id);
    this.toggleError.set(null);
    this.specialtiesSvc.update(specialty.id, { is_active: !specialty.is_active }).subscribe({
      next: () => this.toggling.set(null),
      error: (err: unknown) => {
        this.toggling.set(null);
        this.toggleError.set(clinicSettingsErrorMessage(err, 'No se pudo actualizar el estado de la especialidad.', 'La especialidad ya no existe.'));
      },
    });
  }
}
