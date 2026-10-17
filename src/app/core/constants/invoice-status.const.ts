import { InvoiceStatus } from '../models/invoice.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

export const INVOICE_STATUSES: InvoiceStatus[] = ['borrador', 'emitida', 'pagada', 'parcial', 'anulada', 'vencida'];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  pagada: 'Pagada',
  parcial: 'Pago parcial',
  anulada: 'Anulada',
  vencida: 'Vencida',
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, StatusChipTone> = {
  borrador: 'neutral',
  emitida: 'wait',
  pagada: 'ok',
  parcial: 'wait',
  anulada: 'danger',
  vencida: 'danger',
};

// T3: una vez que hay pagos de por medio (pagada/parcial) ya no se puede
// anular desde esta UI — esta fase no maneja reversión de pagos/créditos.
// "anulada" tampoco se puede volver a anular. No está especificado
// textualmente en el ticket; es una interpretación razonable del schema
// ("Pagos solo si status in (emitida, parcial)") que se puede ajustar.
const VOID_ALLOWED_STATUSES: InvoiceStatus[] = ['borrador', 'emitida', 'vencida'];

export function canVoid(status: InvoiceStatus): boolean {
  return VOID_ALLOWED_STATUSES.includes(status);
}
