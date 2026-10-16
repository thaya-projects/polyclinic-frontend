import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Service, ServiceDto } from '../../../core/models/service.model';
import { ServiceCategory } from '../../../core/models/service-category.model';
import { CURRENCIES } from '../../../core/constants/currencies.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';

@Component({
  selector: 'app-service-form',
  imports: [ReactiveFormsModule],
  templateUrl: './service-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceForm {
  private fb = inject(FormBuilder);

  // Desacoplado de la fuente de datos: recibe las categorías ya resueltas,
  // no sabe si vienen de un mock o de HTTP.
  categories = input.required<ServiceCategory[]>();
  readonly currencies = CURRENCIES;

  // null => alta de servicio nuevo; con valor => edición de ese servicio.
  service = input<Service | null>(null);

  submitted = output<ServiceDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Solo name y currency son obligatorios (T5) — category/duration/precio
  // quedan opcionales a propósito.
  form = this.fb.group({
    name: ['', Validators.required],
    category_id: [''],
    duration_minutes: [30, Validators.min(0)],
    base_price: [0, Validators.min(0)],
    currency: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const s = this.service();
      this.form.patchValue(
        {
          name: s?.name ?? '',
          category_id: s?.category_id ?? '',
          duration_minutes: s?.duration_minutes ?? 30,
          base_price: s?.base_price ?? 0,
          currency: s?.currency ?? '',
        },
        { emitEvent: false },
      );
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({ ...raw, category_id: raw.category_id || null } as ServiceDto);
  }
}
