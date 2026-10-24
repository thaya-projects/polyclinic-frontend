import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { AuditLogEntry } from '../../../core/models/audit-log.model';

// La fila ya trae el nombre del actor resuelto (o uno de los dos
// "valores claros": "Sistema"/"Usuario no disponible") — lo arma el
// contenedor (criterio de aceptación: desacoplada de la fuente de datos).
export type AuditLogRow = AuditLogEntry & { actor_name: string };

// Pantalla de solo lectura (criterio de aceptación T2) — sin ninguna
// acción de editar ni borrar (prohibido).
@Component({
  selector: 'app-audit-log-table',
  imports: [DataTable, DataTableCellDirective],
  templateUrl: './audit-log-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogTable {
  entries = input.required<AuditLogRow[]>();

  view = output<AuditLogEntry>();

  rows = computed(() => this.entries() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'created_at', label: 'Fecha', width: '160px' },
    { key: 'actor_name', label: 'Actor', width: '160px' },
    { key: 'action', label: 'Acción', width: '200px' },
    { key: 'entity', label: 'Entidad', width: '120px' },
    { key: 'entity_id', label: 'ID de entidad', width: '160px' },
    { key: 'actions', label: '', align: 'right', width: '100px' },
  ];

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
