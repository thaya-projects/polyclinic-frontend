import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuperAdminLoginDto } from '../../../core/models/auth.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-superadmin-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './superadmin-login-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminLoginForm {
  private fb = inject(FormBuilder);

  loading = input(false);

  submitted = output<SuperAdminLoginDto>();

  showPassword = signal(false);

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Sin tenant_slug — un super admin no pertenece a ningún tenant.
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as SuperAdminLoginDto);
  }
}
