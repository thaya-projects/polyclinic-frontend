import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateTenantDto } from '../../../../core/models/create-tenant.model';
import { COUNTRIES } from '../../../../core/constants/countries.const';
import { generateRandomPassword } from '../../../../shared/utils/password.util';
import { copyToClipboard } from '../../../../shared/utils/clipboard.util';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

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
  readonly planOptions = PLAN_OPTIONS;
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
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    country_code: ['', Validators.required],
    plan_id: ['', Validators.required],
    trial_days: [14, [Validators.required, Validators.min(0)]],
    default_currency: ['', Validators.required],
    default_timezone: ['', Validators.required],
    locale: ['', Validators.required],
    legal_name: [''],
    tax_id: [''],
    billing_email: ['', [Validators.required, Validators.email]],
    billing_address: [''],
    first_admin: this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
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
