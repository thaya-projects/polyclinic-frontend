import { PaymentMethod } from '../models/payment.model';

export const PAYMENT_METHODS: PaymentMethod[] = ['efectivo', 'tarjeta', 'qr', 'transferencia', 'otro'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  qr: 'QR',
  transferencia: 'Transferencia',
  otro: 'Otro',
};
