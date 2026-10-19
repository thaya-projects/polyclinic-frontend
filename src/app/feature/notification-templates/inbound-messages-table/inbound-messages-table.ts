import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { InboundMessage } from '../../../core/models/inbound-message.model';

// La fila ya trae el nombre del paciente resuelto (o null) — lo arma el
// contenedor (criterio de aceptación: desacoplada de la fuente de datos).
export type InboundMessageRow = InboundMessage & { patient_name: string | null };

// Pantalla de solo lectura (criterio de aceptación T4) — sin ninguna
// acción de responder ni de confirmar cita (prohibido en v1).
@Component({
  selector: 'app-inbound-messages-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './inbound-messages-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboundMessagesTable {
  messages = input.required<InboundMessageRow[]>();

  rows = computed(() => this.messages() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'from_address', label: 'Origen', width: '150px' },
    { key: 'patient_name', label: 'Paciente', width: '180px' },
    { key: 'body', label: 'Mensaje' },
    { key: 'received_at', label: 'Recibido', width: '150px' },
    { key: 'processed', label: 'Estado', align: 'center', width: '120px' },
  ];

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
