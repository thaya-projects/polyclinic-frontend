import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Modal } from '../../../shared/components/modal/modal';
import { AssignRoleForm } from '../assign-role-form/assign-role-form';
import { AssignmentRow, UserRoleAssignmentsTable } from '../user-role-assignments-table/user-role-assignments-table';
import { ClinicUsersService } from '../../../core/services/clinic-users.service';
import { ClinicRolesService } from '../../../core/services/clinic-roles.service';
import { BranchesService } from '../../../core/services/branches.service';
import { UserRolesService } from '../../../core/services/user-roles.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { userRolesSaveErrorMessage } from '../../../shared/utils/roles-error.util';

@Component({
  selector: 'app-user-roles-page',
  imports: [Modal, AssignRoleForm, UserRoleAssignmentsTable],
  templateUrl: './user-roles-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRolesPage {
  private usersSvc = inject(ClinicUsersService);
  private rolesSvc = inject(ClinicRolesService);
  private branchesSvc = inject(BranchesService);
  private userRolesSvc = inject(UserRolesService);

  // El picker de usuarios sigue siendo mock (T14) — no hay endpoint de
  // listado de usuarios en el alcance de T15 — pero el ID que termina
  // usándose en GET/PUT /tenants/users/:userId/roles sí es real. Por eso
  // también se puede tipear un ID de usuario a mano, para poder probar
  // esto contra el backend real sin depender de que esos IDs mock existan.
  readonly users = this.usersSvc.getAll();
  readonly roles = this.rolesSvc.getAll();
  readonly branches = this.branchesSvc.getAll();
  private allAssignments = this.userRolesSvc.getAll();

  readonly listLoading = this.userRolesSvc.loading;
  readonly listError = this.userRolesSvc.error;

  selectedUserId = signal<string | null>(null);
  modalOpen = signal(false);
  saving = signal(false);
  actionError = signal<string | null>(null);

  private assignmentsForSelectedUser = computed(() => {
    const userId = this.selectedUserId();
    return userId ? this.allAssignments().filter(a => a.user_id === userId) : [];
  });

  readonly assignmentRows = computed<AssignmentRow[]>(() =>
    this.assignmentsForSelectedUser().map(a => ({
      id: a.id,
      roleName: this.roles().find(r => r.id === a.role_id)?.name ?? a.role_id,
      branchName: a.branch_id
        ? (this.branches().find(b => b.id === a.branch_id)?.name ?? a.branch_id)
        : 'Todas las sucursales',
    })),
  );

  readonly initialAssignmentsForForm = computed(() =>
    this.assignmentsForSelectedUser().map(a => ({ role_id: a.role_id, branch_id: a.branch_id })),
  );

  constructor() {
    inject(PageTitleService).set('Roles por usuario');
    this.rolesSvc.load();

    const first = this.users()[0];
    if (first) this.selectedUserId.set(first.id);

    // GET /tenants/users/:userId/roles — se pide de nuevo cada vez que
    // cambia el usuario seleccionado (del picker mock o del ID manual).
    effect(() => {
      const userId = this.selectedUserId();
      if (userId) this.userRolesSvc.loadForUser(userId);
    });
  }

  selectUser(userId: string): void {
    this.selectedUserId.set(userId.trim() || null);
  }

  openModal(): void {
    this.actionError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.actionError.set(null);
  }

  onSave(assignments: { role_id: string; branch_id: string | null }[]): void {
    const userId = this.selectedUserId();
    if (!userId) return;

    this.saving.set(true);
    this.actionError.set(null);
    // PUT reemplaza el set completo; la tabla se actualiza con lo que el
    // backend confirma (no con el draft), reflejando el reemplazo real.
    this.userRolesSvc.setForUser(userId, assignments).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(userRolesSaveErrorMessage(err));
      },
    });
  }
}
