import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TenantDetail, EditTenantDto } from '../../../../core/models/tenant-detail.model';
import { COUNTRIES } from '../../../../core/constants/countries.const';
import { emailValidator, fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator } from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';

@Component({
  selector: 'app-edit-tenant-form',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-tenant-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTenantForm {
  private fb = inject(FormBuilder);

  readonly countryOptions = COUNTRIES;

  tenant = input.required<TenantDetail>();
  submitted = output<EditTenantDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    name: ['', requiredNotBlankValidator],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    country_code: ['', Validators.required],
    default_currency: ['', Validators.required],
    default_timezone: ['', Validators.required],
    locale: ['', Validators.required],
    legal_name: [''],
    tax_id: [''],
    billing_email: ['', [Validators.required, emailValidator]],
    billing_address: [''],
  });

  constructor() {
    // No hay password_hash ni first_admin acá — solo los campos editables (T17).
    effect(() => {
      const t = this.tenant();
      this.form.patchValue(
        {
          name: t.name,
          slug: t.slug,
          country_code: t.country_code,
          default_currency: t.default_currency,
          default_timezone: t.default_timezone,
          locale: t.locale,
          legal_name: t.legal_name ?? '',
          tax_id: t.tax_id ?? '',
          billing_email: t.billing_email,
          billing_address: t.billing_address ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (la página muestra el banner).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as EditTenantDto);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
