import { ChangeDetectionStrategy, Component, computed, effect, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FeaturesService } from '../../../core/services/features.service';
import { TreatmentPlanOptionsService } from '../../../core/services/treatment-plan-options.service';
import { TreatmentPlanItemDto, ToothSurface } from '../../../core/models/treatment-plan-item.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

const SURFACE_OPTIONS: { value: ToothSurface; label: string }[] = [
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
  { value: 'vestibular', label: 'Vestibular' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'oclusal', label: 'Oclusal' },
];

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

  added = output<TreatmentPlanItemDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  form = this.fb.group({
    service_id: [''],
    description: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unit_price: [0, [Validators.required, Validators.min(0)]],
    tooth_fdi: [null as number | null],
    surfaces: this.fb.control<ToothSurface[]>([]),
  });

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

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const odontogramOn = this.odontogramEnabled();

    this.added.emit({
      service_id: raw.service_id || null,
      description: raw.description!,
      quantity: raw.quantity!,
      unit_price: raw.unit_price!,
      tooth_fdi: odontogramOn ? raw.tooth_fdi : null,
      surfaces: odontogramOn && raw.surfaces!.length > 0 ? raw.surfaces! : null,
    });

    this.form.reset({ service_id: '', description: '', quantity: 1, unit_price: 0, tooth_fdi: null, surfaces: [] });
  }
}
