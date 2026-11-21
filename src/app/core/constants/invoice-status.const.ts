import { InvoiceStatus } from '../models/invoice.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'partial', 'voided', 'overdue'];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
  partial: 'Pago parcial',
  voided: 'Anulada',
  overdue: 'Vencida',
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, StatusChipTone> = {
  draft: 'neutral',
  issued: 'wait',
  paid: 'ok',
  partial: 'wait',
  voided: 'danger',
  overdue: 'danger',
};

// T3: una vez que hay pagos de por medio (pagada/parcial) ya no se puede
// anular desde esta UI — esta fase no maneja reversión de pagos/créditos.
// "anulada" tampoco se puede volver a anular. No está especificado
// textualmente en el ticket; es una interpretación razonable del schema
// ("Pagos solo si status in (emitida, parcial)") que se puede ajustar.
const VOID_ALLOWED_STATUSES: InvoiceStatus[] = ['draft', 'issued', 'overdue'];

export function canVoid(status: InvoiceStatus): boolean {
  return VOID_ALLOWED_STATUSES.includes(status);
}
