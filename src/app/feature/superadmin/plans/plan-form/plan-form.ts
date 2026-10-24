import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreatePlanDto, Plan, UpdatePlanDto } from '../../../../core/models/plan.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

// Claves de features con checkbox atajo. Cualquier otra clave que el usuario agregue vía JSON
// se preserva; los checkboxes sólo tocan estas tres.
const FEATURE_SHORTCUTS = ['odontogram', 'telemedicine', 'invoicing'] as const;
type FeatureShortcut = (typeof FEATURE_SHORTCUTS)[number];

// Mismo form sirve para crear y para editar: si `plan` viene, es edit (emit `saved`); si es
// null, es create (emit `created`). El único campo que cambia de comportamiento es `code`
// (readonly en edit — el backend no lo actualiza y no queremos confundir al usuario).
@Component({
  selector: 'app-plan-form',
  imports: [ReactiveFormsModule],
  templateUrl: './plan-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanForm {
  private fb = inject(FormBuilder);

  plan = input<Plan | null>(null);

  created = output<CreatePlanDto>();
  saved = output<UpdatePlanDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly shortcuts = FEATURE_SHORTCUTS;

  // El JSON de features vive como string en el form (para mostrar/editar). Los checkboxes leen
  // y escriben este mismo string manteniendo formato y claves extra.
  form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    name: ['', Validators.required],
    price_month: [0, [Validators.required, Validators.min(0)]],
    currency: ['BOB', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    max_professionals: [null as number | null],
    max_branches: [null as number | null],
    allow_multi_specialty: [false],
    features_json: ['{}', Validators.required],
    is_active: [true],
  });

  // Mensaje de error propio del textarea JSON — se calcula on-demand al submit y en cada tecleo
  // no queremos parsear en cada keystroke (ruido visual innecesario).
  featuresError = signal<string | null>(null);

  readonly isEdit = computed(() => this.plan() !== null);

  constructor() {
    // Cuando llega el plan (edit) o cambia entre planes, refresca el form entero.
    effect(() => {
      const p = this.plan();
      if (p) {
        this.form.patchValue(
          {
            code: p.code,
            name: p.name,
            price_month: p.price_month,
            currency: p.currency,
            max_professionals: p.max_professionals,
            max_branches: p.max_branches,
            allow_multi_specialty: p.allow_multi_specialty,
            features_json: JSON.stringify(p.features, null, 2),
            is_active: p.is_active,
          },
          { emitEvent: false },
        );
        this.form.controls.code.disable({ emitEvent: false });
      } else {
        this.form.controls.code.enable({ emitEvent: false });
      }
      this.featuresError.set(null);
    });
  }

  // ── Checkboxes atajo ─────────────────────────────────────────────────────

  isShortcutOn(key: FeatureShortcut): boolean {
    try {
      const parsed = JSON.parse(this.form.controls.features_json.value ?? '{}');
      return parsed?.[key] === true;
    } catch {
      // Si el JSON está mal formado el checkbox se muestra apagado — el error real se muestra
      // sobre el textarea al submit.
      return false;
    }
  }

  toggleShortcut(key: FeatureShortcut, checked: boolean): void {
    let parsed: Record<string, unknown>;
    try {
      const raw = this.form.controls.features_json.value ?? '{}';
      parsed = raw.trim() ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) parsed = {};
    } catch {
      // JSON inválido: arrancamos con objeto vacío para no perder al usuario en un estado sin salida.
      parsed = {};
    }
    parsed[key] = checked;
    this.form.controls.features_json.setValue(JSON.stringify(parsed, null, 2));
    this.featuresError.set(null);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const featuresRaw = this.form.controls.features_json.value ?? '{}';
    let features: Record<string, unknown>;
    try {
      const parsed = JSON.parse(featuresRaw);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        this.featuresError.set('features debe ser un objeto JSON.');
        return;
      }
      features = parsed;
    } catch {
      this.featuresError.set('El JSON de features no es válido.');
      return;
    }
    this.featuresError.set(null);

    const raw = this.form.getRawValue();

    if (this.isEdit()) {
      // Update: enviamos todos los campos editables (backend aplica Optional<T>; enviar el mismo
      // valor no cambia nada, así se evita diff a mano en el form).
      const dto: UpdatePlanDto = {
        name: raw.name!,
        price_month: raw.price_month!,
        currency: raw.currency!,
        max_professionals: raw.max_professionals,
        max_branches: raw.max_branches,
        allow_multi_specialty: raw.allow_multi_specialty!,
        features,
        is_active: raw.is_active!,
      };
      this.saved.emit(dto);
      return;
    }

    const createDto: CreatePlanDto = {
      code: raw.code!,
      name: raw.name!,
      price_month: raw.price_month!,
      currency: raw.currency!,
      max_professionals: raw.max_professionals,
      max_branches: raw.max_branches,
      allow_multi_specialty: raw.allow_multi_specialty!,
      features,
      is_active: raw.is_active!,
    };
    this.created.emit(createDto);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
