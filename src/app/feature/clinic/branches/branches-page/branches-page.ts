import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { BranchesTable } from '../branches-table/branches-table';
import { BranchForm } from '../branch-form/branch-form';
import { Modal } from '../../../../shared/components/modal/modal';
import { ConfirmDialog, ConfirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { BranchesService } from '../../../../core/services/branches.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../../core/models/branch.model';
import { clinicSettingsErrorMessage } from '../../../../shared/utils/clinic-settings-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-branches-page',
  imports: [BranchesTable, BranchForm, Modal, ConfirmDialog],
  templateUrl: './branches-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesPage {
  private branchesSvc = inject(BranchesService);
  private allBranches = this.branchesSvc.getAll();

  readonly listLoading = this.branchesSvc.loading;
  readonly listError = this.branchesSvc.error;
  readonly branches = computed(() => this.allBranches());

  modalMode = signal<ModalMode>('none');
  selectedBranch = signal<Branch | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  private createForm = viewChild<BranchForm>('createForm');
  private editForm = viewChild<BranchForm>('editForm');

  branchToDeactivate = signal<Branch | null>(null);
  deactivating = signal(false);
  deactivateError = signal<string | null>(null);

  readonly confirmingDeactivate = computed(() => this.branchToDeactivate() !== null);
  readonly deactivateTone: ConfirmTone = 'danger';

  constructor() {
    inject(PageTitleService).set('Sucursales');
    this.branchesSvc.load();
  }

  openCreateModal(): void {
    this.selectedBranch.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(branch: Branch): void {
    this.selectedBranch.set(branch);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedBranch.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreateBranchDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.branchesSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        // Error de un campo → debajo del input; si no, banner con el motivo.
        this.actionError.set(this.createForm()?.applyServerError(err)
          ? null
          : clinicSettingsErrorMessage(err, 'No se pudo crear la sucursal.', 'La sucursal ya no existe.'));
      },
    });
  }

  onSaveEdit(dto: UpdateBranchDto): void {
    const branch = this.selectedBranch();
    if (!branch) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.branchesSvc.update(branch.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(this.editForm()?.applyServerError(err)
          ? null
          : clinicSettingsErrorMessage(err, 'No se pudo guardar la sucursal.', 'La sucursal ya no existe.'));
      },
    });
  }

  requestDeactivate(branch: Branch): void {
    this.deactivateError.set(null);
    this.branchToDeactivate.set(branch);
  }

  cancelDeactivate(): void {
    if (this.deactivating()) return;
    this.branchToDeactivate.set(null);
  }

  confirmDeactivate(): void {
    const branch = this.branchToDeactivate();
    if (!branch) return;
    this.deactivating.set(true);
    this.deactivateError.set(null);
    this.branchesSvc.deactivate(branch.id).subscribe({
      next: () => {
        this.deactivating.set(false);
        this.branchToDeactivate.set(null);
      },
      error: (err: unknown) => {
        this.deactivating.set(false);
        this.deactivateError.set(clinicSettingsErrorMessage(err, 'No se pudo desactivar la sucursal.', 'La sucursal ya no existe.'));
        this.branchToDeactivate.set(null);
      },
    });
  }
}
