import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FeaturesService } from '../../../core/services/features.service';
import { TreatmentPlanOptionsService } from '../../../core/services/treatment-plan-options.service';
import { TreatmentPlanItemDto, ToothSurface } from '../../../core/models/treatment-plan-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

const SURFACE_OPTIONS: { value: ToothSurface; label: string }[] = [
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
  { value: 'vestibular', label: 'Vestibular' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'oclusal', label: 'Oclusal' },
];

// Rangos FDI válidos (mismo criterio que el VO ToothFdi del backend, Fase 6): permanentes 11-18,
// 21-28, 31-38, 41-48 y temporales 51-55, 61-65, 71-75, 81-85.
const FDI_RANGES: [number, number][] = [
  [11, 18], [21, 28], [31, 38], [41, 48], [51, 55], [61, 65], [71, 75], [81, 85],
];
const FDI_ERROR_MESSAGE =
  'Pieza FDI inválida (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85).';

function toothFdiValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  const valid = Number.isInteger(n) && FDI_RANGES.some(([min, max]) => n >= min && n <= max);
  return valid ? null : { toothFdi: true };
}

function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return Number.isInteger(Number(value)) ? null : { integer: true };
}

// Un item sin servicio necesita descripción (si no, no hay forma de saber qué es). Con servicio,
// la descripción es opcional. Mismo patrón que documentRequiresTypeValidator del alta de paciente:
// el error queda en el control `description` para mostrarse debajo de su input.
function descriptionOrServiceValidator(group: AbstractControl): ValidationErrors | null {
  const service = group.get('service_id');
  const description = group.get('description');
  if (!service || !description) return null;

  const missing = !service.value && !(description.value as string | null)?.trim();
  const otherErrors = { ...description.errors };
  delete otherErrors['descriptionOrService'];

  if (missing) {
    description.setErrors({ ...otherErrors, descriptionOrService: true });
  } else {
    description.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  }
  return null;
}

// Form de alta rápida de un item — se resetea después de cada "Agregar"
// (igual que un quick-add, no hay HTTP de por medio así que no aplica el
// cuidado de "no resetear hasta que el POST confirme" que sí usamos en
// forms conectados a backend real).
@Component({
  selector: 'app-treatment-plan-item-form',
  imports: [ReactiveFormsModule],
  templateUrl: './treatment-plan-item-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlanItemForm {
  private fb = inject(FormBuilder);
  private optionsSvc = inject(TreatmentPlanOptionsService);
  private features = inject(FeaturesService);

  readonly services = this.optionsSvc.services();
  readonly surfaceOptions = SURFACE_OPTIONS;

  // Cerrado por default (igual que el sidebar) hasta que FeaturesService
  // confirme que el tenant tiene el módulo activo.
  readonly odontogramEnabled = computed(() => this.features.enabled('odontogram'));

  // true (default, quick-add del alta del plan): se limpia al emitir. false (alta contra el backend
  // desde el detalle): conserva los valores hasta que el contenedor confirme, para poder marcar el
  // campo que rechace el backend (applyServerError).
  resetOnAdd = input(true);

  added = output<TreatmentPlanItemDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;

  // fieldErrorMessage + los errores propios de este form.
  errorMessage(control: AbstractControl | null): string {
    const errors = control?.errors;
    if (errors && typeof errors['server'] !== 'string') {
      if (errors['descriptionOrService']) return 'Ingresá una descripción o elegí un servicio.';
      if (errors['toothFdi']) return FDI_ERROR_MESSAGE;
      if (errors['integer']) return 'La cantidad debe ser un número entero.';
      if (errors['min'] && control === this.form.controls.quantity) return 'La cantidad debe ser al menos 1.';
      if (errors['min'] && control === this.form.controls.unit_price) return 'El precio no puede ser negativo.';
    }
    return fieldErrorMessage(control);
  }

  // Reglas del backend (TreatmentPlanItem.ValidateAmounts): quantity > 0, unit_price >= 0.
  form = this.fb.group(
    {
      service_id: [''],
      description: [''],
      quantity: [1 as number | null, [Validators.required, Validators.min(1), integerValidator]],
      unit_price: [0 as number | null, [Validators.required, Validators.min(0)]],
      tooth_fdi: [null as number | null, toothFdiValidator],
      surfaces: this.fb.control<ToothSurface[]>([]),
    },
    { validators: descriptionOrServiceValidator },
  );

  private readonly selectedServiceId = toSignal(this.form.controls.service_id.valueChanges, { initialValue: '' });

  constructor() {
    // Criterio de aceptación: al elegir un service, propone unit_price =
    // base_price (el campo sigue siendo editable después).
    effect(() => {
      const serviceId = this.selectedServiceId();
      if (!serviceId) return;
      const service = this.services().find(s => s.id === serviceId);
      if (service) this.form.patchValue({ unit_price: service.base_price }, { emitEvent: false });
    });
  }

  toggleSurface(surface: ToothSurface, checked: boolean): void {
    const current = this.form.controls.surfaces.value ?? [];
    this.form.controls.surfaces.setValue(
      checked ? [...current, surface] : current.filter(s => s !== surface),
    );
  }

  isSurfaceChecked(surface: ToothSurface): boolean {
    return (this.form.controls.surfaces.value ?? []).includes(surface);
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const odontogramOn = this.odontogramEnabled();
    // Con servicio y sin descripción, el item se muestra con el nombre del servicio.
    const serviceName = this.services().find(s => s.id === raw.service_id)?.name ?? '';

    this.added.emit({
      service_id: raw.service_id || null,
      description: raw.description?.trim() || serviceName,
      quantity: raw.quantity!,
      unit_price: raw.unit_price!,
      tooth_fdi: odontogramOn && raw.tooth_fdi !== null ? Number(raw.tooth_fdi) : null,
      surfaces: odontogramOn && raw.surfaces!.length > 0 ? raw.surfaces! : null,
    });

    if (this.resetOnAdd()) this.resetForm();
  }

  resetForm(): void {
    this.form.reset({ service_id: '', description: '', quantity: 1, unit_price: 0, tooth_fdi: null, surfaces: [] });
  }
}
