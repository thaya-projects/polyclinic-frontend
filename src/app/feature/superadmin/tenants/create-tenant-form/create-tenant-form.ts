import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTenantDto } from '../../../../core/models/create-tenant.model';
import { COUNTRIES } from '../../../../core/constants/countries.const';
import { PlansService } from '../../../../core/services/plans.service';
import { generateRandomPassword } from '../../../../shared/utils/password.util';
import { copyToClipboard } from '../../../../shared/utils/clipboard.util';
import { emailValidator, fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator } from '../../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../../shared/utils/server-errors.util';

const STEP_LABELS = ['Datos de la clínica', 'Configuración regional', 'Facturación', 'Administrador inicial'];

@Component({
  selector: 'app-create-tenant-form',
  imports: [ReactiveFormsModule],
  templateUrl: './create-tenant-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTenantForm {
  private fb = inject(FormBuilder);

  readonly countryOptions = COUNTRIES;
  private readonly plansSvc = inject(PlansService);
  // plan_id es el Guid del plan (backend), no un código: se listan los planes activos reales.
  readonly planOptions = computed(() =>
    this.plansSvc.getAll()().filter(p => p.is_active).map(p => ({ value: p.id, label: p.name })),
  );
  readonly stepLabels = STEP_LABELS;
  readonly totalSteps = STEP_LABELS.length;

  submitted = output<CreateTenantDto>();
  cancelled = output<void>();

  currentStep = signal(1);
  showPassword = signal(false);
  passwordCopied = signal(false);

  private slugTouched = false;
  private regionTouched = new Set<'default_currency' | 'default_timezone' | 'locale'>();

  form = this.fb.group({
    name: ['', requiredNotBlankValidator],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    country_code: ['', Validators.required],
    plan_id: ['', Validators.required],
    trial_days: [14, [Validators.required, Validators.min(0)]],
    default_currency: ['', Validators.required],
    default_timezone: ['', Validators.required],
    locale: ['', Validators.required],
    legal_name: [''],
    tax_id: [''],
    billing_email: ['', [Validators.required, emailValidator]],
    billing_address: [''],
    first_admin: this.fb.group({
      full_name: ['', requiredNotBlankValidator],
      email: ['', [Validators.required, emailValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    }),
  });

  private readonly stepControls: (keyof typeof this.form.controls)[][] = [
    ['name', 'slug', 'country_code', 'plan_id', 'trial_days'],
    ['default_currency', 'default_timezone', 'locale'],
    ['legal_name', 'tax_id', 'billing_email', 'billing_address'],
    ['first_admin'],
  ];

  constructor() {
    this.plansSvc.load();
    this.form.controls.name.valueChanges.subscribe(name => {
      if (this.slugTouched) return;
      this.form.controls.slug.setValue(this.slugify(name ?? ''), { emitEvent: false });
    });

    this.form.controls.slug.valueChanges.subscribe(() => {
      this.slugTouched = true;
    });

    this.form.controls.country_code.valueChanges.subscribe(code => {
      const defaults = code ? COUNTRIES.find(c => c.value === code) : undefined;
      if (!defaults) return;

      if (!this.regionTouched.has('default_currency')) {
        this.form.controls.default_currency.setValue(defaults.currency, { emitEvent: false });
      }
      if (!this.regionTouched.has('default_timezone')) {
        this.form.controls.default_timezone.setValue(defaults.timezone, { emitEvent: false });
      }
      if (!this.regionTouched.has('locale')) {
        this.form.controls.locale.setValue(defaults.locale, { emitEvent: false });
      }
    });

    (['default_currency', 'default_timezone', 'locale'] as const).forEach(key => {
      this.form.controls[key].valueChanges.subscribe(() => this.regionTouched.add(key));
    });
  }

  next(): void {
    if (!this.currentStepValid()) {
      this.markCurrentStepTouched();
      return;
    }
    this.currentStep.update(step => Math.min(this.totalSteps, step + 1));
  }

  back(): void {
    this.currentStep.update(step => Math.max(1, step - 1));
  }

  submit(): void {
    if (this.form.invalid) {
      this.markCurrentStepTouched();
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue() as CreateTenantDto);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló y vuelve al paso donde está
  // ese input (el submit se hace desde el último paso). Los campos del admin inicial llegan sin el
  // prefijo first_admin. false = no es de un campo de este form (la página muestra el banner).
  applyServerError(err: unknown): boolean {
    const applied = applyServerError(this.form, err, {
      full_name: 'first_admin.full_name',
      email: 'first_admin.email',
      password: 'first_admin.password',
    });
    if (applied) {
      const step = this.stepControls.findIndex(keys => keys.some(key => this.form.controls[key].invalid));
      if (step >= 0) this.currentStep.set(step + 1);
    }
    return applied;
  }

  cancel(): void {
    this.cancelled.emit();
  }

  generatePassword(): void {
    this.form.controls.first_admin.controls.password.setValue(generateRandomPassword());
    this.showPassword.set(true);
  }

  async copyPassword(): Promise<void> {
    const password = this.form.controls.first_admin.controls.password.value;
    if (!password) return;
    const ok = await copyToClipboard(password);
    if (!ok) return;
    this.passwordCopied.set(true);
    setTimeout(() => this.passwordCopied.set(false), 1500);
  }

  // ── Validación visible: borde rojo + mensaje debajo del campo ───────
  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  private currentStepValid(): boolean {
    return this.stepControls[this.currentStep() - 1].every(key => this.form.controls[key].valid);
  }

  private markCurrentStepTouched(): void {
    this.stepControls[this.currentStep() - 1].forEach(key => this.form.controls[key].markAllAsTouched());
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita tildes tras el NFD
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
