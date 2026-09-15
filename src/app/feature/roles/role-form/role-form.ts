import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicRole, RoleDto, isSystemRole } from '../../../core/models/clinic-role.model';
import { ROLE_MODULE_PERMISSIONS } from '../../../core/constants/role-permissions.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-role-form',
  imports: [ReactiveFormsModule],
  templateUrl: './role-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleForm {
  private fb = inject(FormBuilder);

  readonly permissionOptions = ROLE_MODULE_PERMISSIONS;
  private readonly catalogCodes = ROLE_MODULE_PERMISSIONS.map(p => p.code);

  // null => alta de rol nuevo; con valor => edición (de solo lectura si es
  // un rol de sistema, tenant_id null).
  role = input<ClinicRole | null>(null);

  submitted = output<RoleDto>();

  readonly readOnly = computed(() => {
    const r = this.role();
    return !!r && isSystemRole(r);
  });

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // FormArray indexado por posición (no un FormGroup keyed por código):
  // los códigos de permiso tienen puntos ("roles.manage") y Angular no
  // permite esos caracteres en claves de FormGroup.
  form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    permissions: this.fb.array(this.catalogCodes.map(() => this.fb.control(false))),
  });

  constructor() {
    effect(() => {
      const r = this.role();
      this.form.patchValue(
        {
          code: r?.code ?? '',
          name: r?.name ?? '',
          permissions: this.catalogCodes.map(code => !!r?.permissions.includes(code)),
        },
        { emitEvent: false },
      );

      if (this.readOnly()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  submit(): void {
    if (this.readOnly()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const selectedCatalogPerms = this.catalogCodes.filter((_, i) => raw.permissions[i]);
    // Preserva permisos de otros módulos que el rol ya tuviera — este form
    // no los muestra ni los toca, no debería borrarlos al guardar.
    const preserved = (this.role()?.permissions ?? []).filter(p => !this.catalogCodes.includes(p));

    this.submitted.emit({
      code: raw.code!,
      name: raw.name!,
      permissions: [...preserved, ...selectedCatalogPerms],
    });
  }
}
