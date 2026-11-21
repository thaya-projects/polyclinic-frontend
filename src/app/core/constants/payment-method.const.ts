import { PaymentMethod } from '../models/payment.model';

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'qr', 'transfer', 'other'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  qr: 'QR',
  transfer: 'Transferencia',
  other: 'Otro',
};
