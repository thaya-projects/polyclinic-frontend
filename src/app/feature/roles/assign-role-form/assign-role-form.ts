import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AssignmentRow, UserRoleAssignmentsTable } from '../user-role-assignments-table/user-role-assignments-table';
import { ClinicRole } from '../../../core/models/clinic-role.model';
import { Branch } from '../../../core/models/branch.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

interface DraftAssignment {
  draftId: string;
  role_id: string;
  branch_id: string | null;
}

@Component({
  selector: 'app-assign-role-form',
  imports: [ReactiveFormsModule, UserRoleAssignmentsTable],
  templateUrl: './assign-role-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignRoleForm {
  private fb = inject(FormBuilder);

  roles = input.required<ClinicRole[]>();
  branches = input.required<Branch[]>();
  // Asignaciones ya guardadas del usuario — el draft arranca desde acá,
  // así se pueden quitar roles ya existentes además de agregar nuevos.
  initialAssignments = input.required<{ role_id: string; branch_id: string | null }[]>();

  saved = output<{ role_id: string; branch_id: string | null }[]>();

  private draft = signal<DraftAssignment[]>([]);
  duplicateError = signal(false);

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    role_id: ['', Validators.required],
    branch_id: [''],
  });

  // branch_id vacío ("") se interpreta como "todas las sucursales" (null).
  readonly rows = computed<AssignmentRow[]>(() =>
    this.draft().map(a => ({
      id: a.draftId,
      roleName: this.roles().find(r => r.id === a.role_id)?.name ?? a.role_id,
      branchName: a.branch_id
        ? (this.branches().find(b => b.id === a.branch_id)?.name ?? a.branch_id)
        : 'Todas las sucursales',
    })),
  );

  constructor() {
    // El draft se re-siembra cada vez que cambian las asignaciones
    // iniciales (ej. el modal se abre para un usuario distinto).
    effect(() => {
      this.draft.set(this.initialAssignments().map(a => ({ draftId: crypto.randomUUID(), ...a })));
    });
  }

  addToDraft(): void {
    this.duplicateError.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const role_id = this.form.controls.role_id.value!;
    const branch_id = this.form.controls.branch_id.value || null;

    const alreadyAdded = this.draft().some(a => a.role_id === role_id && a.branch_id === branch_id);
    if (alreadyAdded) {
      this.duplicateError.set(true);
      return;
    }

    this.draft.update(list => [...list, { draftId: crypto.randomUUID(), role_id, branch_id }]);
    this.form.reset({ role_id: '', branch_id: '' });
  }

  removeFromDraft(draftId: string): void {
    this.draft.update(list => list.filter(a => a.draftId !== draftId));
  }

  submit(): void {
    this.saved.emit(this.draft().map(({ role_id, branch_id }) => ({ role_id, branch_id })));
  }
}
