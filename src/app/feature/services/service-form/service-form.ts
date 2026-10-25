import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Service, ServiceDto } from '../../../core/models/service.model';
import { ServiceCategory } from '../../../core/models/service-category.model';
import { currencyOptions, resolveTenantCurrency } from '../../../core/constants/currencies.const';
import { AuthStore } from '../../../core/services/auth-store.service';
import {
  fieldErrorMessage, fieldInputClass, isFieldInvalid, requiredNotBlankValidator,
} from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

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
  // Moneda de la clínica preseleccionada; las demás quedan disponibles para cambiarla.
  readonly tenantCurrency = resolveTenantCurrency(inject(AuthStore).tenant());
  readonly currencies = currencyOptions(this.tenantCurrency);

  // null => alta de servicio nuevo; con valor => edición de ese servicio.
  service = input<Service | null>(null);

  submitted = output<ServiceDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  // Solo name y currency son obligatorios (T5) — category/duration/precio
  // quedan opcionales a propósito (vacíos, el backend aplica 30 min / 0). Si vienen, mismas reglas
  // que Service.ValidateProfile: duración > 0 (entera) y precio >= 0.
  form = this.fb.group({
    name: ['', requiredNotBlankValidator],
    category_id: [''],
    duration_minutes: this.fb.control<number | null>(30, [Validators.min(1), Validators.pattern(/^\d+$/)]),
    base_price: this.fb.control<number | null>(0, Validators.min(0)),
    currency: [this.tenantCurrency, Validators.required],
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
          currency: s?.currency ?? this.tenantCurrency,
        },
        { emitEvent: false },
      );
    });
  }

  // Error 400/422 del backend: lo marca en el input del campo que falló. false = no es de un campo
  // de este form (el caller muestra el mensaje general).
  applyServerError(err: unknown): boolean {
    return applyServerError(this.form, err);
  }

  // Duración con decimales (pattern): fieldErrorMessage describe el patrón de los slugs.
  durationErrorMessage(): string {
    const control = this.form.controls.duration_minutes;
    return control.hasError('pattern') && !control.hasError('server')
      ? 'Ingresá una cantidad entera de minutos.'
      : fieldErrorMessage(control);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      ...raw,
      name: (raw.name ?? '').trim(),
      category_id: raw.category_id || null,
    } as ServiceDto);
  }
}
