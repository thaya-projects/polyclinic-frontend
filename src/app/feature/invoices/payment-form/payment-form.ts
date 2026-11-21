import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { PaymentDto, PaymentMethod } from '../../../core/models/payment.model';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../../core/constants/payment-method.const';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../shared/utils/form-validation.util';
import { applyServerError } from '../../../shared/utils/server-errors.util';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Criterio de aceptación: valida en el cliente que amount sea mayor a 0 y
// no supere el saldo pendiente — el backend valida igual (409 si se pasa),
// esto es solo para no hacer esperar al usuario a esa respuesta. Validator
// de control (no de grupo) para que el error quede debajo del input.
function amountValidatorFor(balance: () => number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const amount = Number(control.value);
    if (!(amount > 0)) return { amountInvalid: true };
    if (amount > balance()) return { amountExceedsBalance: true };
    return null;
  };
}

@Component({
  selector: 'app-payment-form',
  imports: [ReactiveFormsModule],
  templateUrl: './payment-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentForm {
  private fb = inject(FormBuilder);

  // Saldo pendiente actual de la factura — desacoplado de la fuente de
  // datos: no sabe cómo se calculó (total - suma de pagos ya la resuelve
  // el contenedor).
  balance = input.required<number>();

  added = output<PaymentDto>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly methods = PAYMENT_METHODS;
  readonly methodLabels = PAYMENT_METHOD_LABELS;

  form = this.fb.group({
    amount: [0, [Validators.required, amountValidatorFor(() => this.balance())]],
    method: this.fb.control<PaymentMethod>('cash', Validators.required),
    reference: [''],
    paid_at: [todayIsoDate(), Validators.required],
  });

  constructor() {
    // El saldo cambia después de cada pago (lo recalcula el contenedor): se re-valida el monto
    // para que el límite del validator sea siempre el saldo actual.
    effect(() => {
      this.balance();
      this.form.controls.amount.updateValueAndValidity({ emitEvent: false });
    });
  }

  errorMessage(control: AbstractControl | null): string {
    if (control?.errors?.['amountInvalid']) return 'El monto tiene que ser mayor a 0.';
    if (control?.errors?.['amountExceedsBalance']) {
      return `El monto no puede superar el saldo pendiente (${this.balance().toFixed(2)}).`;
    }
    return fieldErrorMessage(control);
  }

  // Error 400/422 del backend al registrar el pago: como el form ya se reseteó al emitir, se
  // restauran los valores enviados (`dto`) y se marca el input del campo que falló.
  // false = no es de un campo de este form (el contenedor muestra el mensaje general).
  applyServerError(err: unknown, dto?: PaymentDto): boolean {
    if (dto) {
      this.form.setValue(
        {
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference ?? '',
          paid_at: dto.paid_at ? dto.paid_at.slice(0, 10) : todayIsoDate(),
        },
        { emitEvent: false },
      );
    }
    return applyServerError(this.form, err);
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.added.emit({
      amount: Number(raw.amount),
      method: raw.method!,
      reference: raw.reference || null,
      paid_at: raw.paid_at ? new Date(raw.paid_at).toISOString() : undefined,
    });
    this.form.reset({ amount: 0, method: 'cash', reference: '', paid_at: todayIsoDate() });
  }
}
