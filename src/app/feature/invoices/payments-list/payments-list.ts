import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Payment } from '../../../core/models/payment.model';
import { PAYMENT_METHOD_LABELS } from '../../../core/constants/payment-method.const';

// Desacoplado de la fuente de datos (criterio de aceptación T4). Sin
// acciones de editar/borrar a propósito — no se permite en este ticket.
@Component({
  selector: 'app-payments-list',
  imports: [],
  templateUrl: './payments-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentsList {
  payments = input.required<Payment[]>();

  readonly methodLabels = PAYMENT_METHOD_LABELS;

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
