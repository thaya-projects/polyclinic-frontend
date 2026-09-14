import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginDto } from '../../../core/models/auth.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  private fb = inject(FormBuilder);

  // El LoginPage controla el estado de loading (mock por ahora, real en T14).
  loading = input(false);

  submitted = output<LoginDto>();
  showPassword = signal(false);

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    tenant_slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as LoginDto);
  }
}
