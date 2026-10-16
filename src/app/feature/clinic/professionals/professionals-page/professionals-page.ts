import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { of, switchMap } from 'rxjs';
import { ProfessionalsTable } from '../professionals-table/professionals-table';
import { ProfessionalForm } from '../professional-form/professional-form';
import { Modal } from '../../../../shared/components/modal/modal';
import { ConfirmDialog, ConfirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ProfessionalsService } from '../../../../core/services/professionals.service';
import { SpecialtiesService } from '../../../../core/services/specialties.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import {
  CreateProfessionalDto, Professional, UpdateProfessionalDto,
} from '../../../../core/models/professional.model';
import { httpErrorMessage } from '../../../../shared/utils/http-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-professionals-page',
  imports: [ProfessionalsTable, ProfessionalForm, Modal, ConfirmDialog],
  templateUrl: './professionals-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsPage {
  private professionalsSvc = inject(ProfessionalsService);
  private specialtiesSvc = inject(SpecialtiesService);
  private allProfessionals = this.professionalsSvc.getAll();
  private allSpecialties = this.specialtiesSvc.getAll();

  readonly listLoading = this.professionalsSvc.loading;
  readonly listError = this.professionalsSvc.error;
  readonly professionals = computed(() => this.allProfessionals());

  // Solo specialties activas para el selector — las inactivas se pueden ver en historial pero no
  // se pueden asignar a un professional nuevo.
  readonly availableSpecialties = computed(() =>
    this.allSpecialties().filter(s => s.is_active));

  readonly specialtyNameById = computed(() =>
    this.allSpecialties().reduce<Record<string, string>>((acc, s) => {
      acc[s.id] = s.name;
      return acc;
    }, {}));

  modalMode = signal<ModalMode>('none');
  selectedProfessional = signal<Professional | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  professionalToDeactivate = signal<Professional | null>(null);
  deactivating = signal(false);
  deactivateError = signal<string | null>(null);
  readonly confirmingDeactivate = computed(() => this.professionalToDeactivate() !== null);
  readonly deactivateTone: ConfirmTone = 'danger';

  constructor() {
    inject(PageTitleService).set('Profesionales');
    this.professionalsSvc.load();
    this.specialtiesSvc.load();
  }

  openCreateModal(): void {
    this.selectedProfessional.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(professional: Professional): void {
    this.selectedProfessional.set(professional);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedProfessional.set(null);
    this.actionError.set(null);
  }

  onCreate(payload: { dto: CreateProfessionalDto }): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.professionalsSvc.create(payload.dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  onSaveEdit(
    payload: { patch: UpdateProfessionalDto; specialtyIds: string[]; specialtiesChanged: boolean }
  ): void {
    const professional = this.selectedProfessional();
    if (!professional) return;

    this.saving.set(true);
    this.actionError.set(null);

    // PATCH sólo si cambió algo del profile. Si además cambiaron specialties, encadenar el PUT.
    // Sin cambios de profile → solo PUT. Sin cambios de nada → close directo.
    const hasPatch = Object.keys(payload.patch).length > 0;
    if (!hasPatch && !payload.specialtiesChanged) {
      this.saving.set(false);
      this.closeModal();
      return;
    }

    const profile$ = hasPatch
      ? this.professionalsSvc.update(professional.id, payload.patch)
      : of(professional);
    const chain$ = payload.specialtiesChanged
      ? profile$.pipe(switchMap(() =>
          this.professionalsSvc.replaceSpecialties(professional.id, { specialty_ids: payload.specialtyIds })))
      : profile$;

    chain$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  requestDeactivate(professional: Professional): void {
    this.deactivateError.set(null);
    this.professionalToDeactivate.set(professional);
  }

  cancelDeactivate(): void {
    if (this.deactivating()) return;
    this.professionalToDeactivate.set(null);
  }

  confirmDeactivate(): void {
    const professional = this.professionalToDeactivate();
    if (!professional) return;
    this.deactivating.set(true);
    this.deactivateError.set(null);
    this.professionalsSvc.deactivate(professional.id).subscribe({
      next: () => {
        this.deactivating.set(false);
        this.professionalToDeactivate.set(null);
      },
      error: (err: unknown) => {
        this.deactivating.set(false);
        this.deactivateError.set(httpErrorMessage(err));
        this.professionalToDeactivate.set(null);
      },
    });
  }
}
