import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { PaymentDto, PaymentMethod } from '../../../core/models/payment.model';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../../core/constants/payment-method.const';
import { fieldInputClass } from '../../../shared/utils/form-validation.util';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Criterio de aceptación: valida en el cliente que amount sea mayor a 0 y
// no supere el saldo pendiente — el backend valida igual (409 si se pasa),
// esto es solo para no hacer esperar al usuario a esa respuesta.
function amountValidatorFor(balance: () => number) {
  return (group: AbstractControl): ValidationErrors | null => {
    const amount = Number(group.get('amount')?.value);
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
  readonly methods = PAYMENT_METHODS;
  readonly methodLabels = PAYMENT_METHOD_LABELS;

  form = this.fb.group(
    {
      amount: [0, Validators.required],
      method: this.fb.control<PaymentMethod>('efectivo', Validators.required),
      reference: [''],
      paid_at: [todayIsoDate(), Validators.required],
    },
    { validators: amountValidatorFor(() => this.balance()) },
  );

  get amountErrorMessage(): string | null {
    if (!this.form.controls.amount.touched) return null;
    if (this.form.errors?.['amountInvalid']) return 'El monto tiene que ser mayor a 0.';
    if (this.form.errors?.['amountExceedsBalance']) {
      return `El monto no puede superar el saldo pendiente (${this.balance().toFixed(2)}).`;
    }
    return null;
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
    this.form.reset({ amount: 0, method: 'efectivo', reference: '', paid_at: todayIsoDate() });
  }
}
