import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { InvoiceStatusBadge } from '../invoice-status-badge/invoice-status-badge';
import { Invoice } from '../../../core/models/invoice.model';

// La fila ya trae el nombre del paciente resuelto (lo arma el contenedor)
// — la tabla no sabe nada de InvoiceOptionsService ni de cómo se resolvió
// (criterio de aceptación T1: desacoplada de la fuente de datos).
export type InvoiceRow = Invoice & { patient_name: string };

@Component({
  selector: 'app-invoices-table',
  imports: [DataTable, DataTableCellDirective, InvoiceStatusBadge],
  templateUrl: './invoices-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesTable {
  invoices = input.required<InvoiceRow[]>();

  view = output<Invoice>();

  // app-data-table trabaja con filas genéricas; InvoiceRow no tiene index
  // signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.invoices() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'invoice_number', label: 'N° de factura', width: '140px' },
    { key: 'patient_name', label: 'Paciente' },
    { key: 'status', label: 'Estado', width: '140px' },
    { key: 'total', label: 'Total', align: 'right', width: '140px' },
    { key: 'issued_at', label: 'Emitida', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '100px' },
  ];

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
