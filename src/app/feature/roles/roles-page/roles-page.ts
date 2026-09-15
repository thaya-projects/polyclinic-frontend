import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RolesTable } from '../roles-table/roles-table';
import { RoleForm } from '../role-form/role-form';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ClinicRolesService } from '../../../core/services/clinic-roles.service';
import { ClinicRole, RoleDto, isSystemRole } from '../../../core/models/clinic-role.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { roleDeleteErrorMessage, roleSaveErrorMessage } from '../../../shared/utils/roles-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-roles-page',
  imports: [RolesTable, RoleForm, Modal, ConfirmDialog],
  templateUrl: './roles-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPage {
  private rolesSvc = inject(ClinicRolesService);

  readonly roles = this.rolesSvc.getAll();
  readonly listLoading = this.rolesSvc.loading;
  readonly listError = this.rolesSvc.error;

  modalMode = signal<ModalMode>('none');
  selectedRole = signal<ClinicRole | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  roleToDelete = signal<ClinicRole | null>(null);
  deleting = signal(false);
  deleteError = signal<string | null>(null);

  readonly deleteMessage = computed(() => {
    const err = this.deleteError();
    if (err) return err;
    const role = this.roleToDelete();
    return role ? `¿Seguro que querés eliminar el rol "${role.name}"? Esta acción no se puede deshacer.` : '';
  });

  constructor() {
    inject(PageTitleService).set('Roles');
    this.rolesSvc.load();
  }

  openCreateModal(): void {
    this.selectedRole.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEditModal(role: ClinicRole): void {
    this.selectedRole.set(role);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedRole.set(null);
    this.actionError.set(null);
  }

  isReadOnly(role: ClinicRole | null): boolean {
    return !!role && isSystemRole(role);
  }

  onSave(dto: RoleDto): void {
    const role = this.selectedRole();
    this.saving.set(true);
    this.actionError.set(null);

    const request$ = role ? this.rolesSvc.update(role.id, dto) : this.rolesSvc.create(dto);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(roleSaveErrorMessage(err));
      },
    });
  }

  requestDelete(role: ClinicRole): void {
    this.roleToDelete.set(role);
    this.deleteError.set(null);
  }

  cancelDelete(): void {
    this.roleToDelete.set(null);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const role = this.roleToDelete();
    if (!role) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.rolesSvc.delete(role.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.roleToDelete.set(null);
      },
      // 409: hay user_role asociados a este rol — se muestra en el propio
      // diálogo de confirmación en vez de cerrarlo solo.
      error: err => {
        this.deleting.set(false);
        this.deleteError.set(roleDeleteErrorMessage(err));
      },
    });
  }
}
