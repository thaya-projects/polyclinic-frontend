import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { NotificationChannel, NotificationTemplate } from '../../../core/models/notification-template.model';
import { NOTIFICATION_CHANNEL_LABELS } from '../../../core/constants/notification-channel.const';

// Desacoplada de la fuente de datos (criterio de aceptación T1): recibe
// la lista ya resuelta, no sabe si viene de un mock o de HTTP, ni qué
// significa "global" más allá de tenant_id === null.
@Component({
  selector: 'app-notification-templates-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './notification-templates-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTemplatesTable {
  templates = input.required<NotificationTemplate[]>();

  view = output<NotificationTemplate>();

  // app-data-table trabaja con filas genéricas; NotificationTemplate no
  // tiene index signature, así que se castea una sola vez acá.
  rows = computed(() => this.templates() as unknown as Record<string, unknown>[]);

  // Método en vez de indexar el Record directo en el template: `row` es
  // `any` (viene de DataTableCellDirective), e indexar un Record con un
  // valor `any` dispara TS7053 bajo strictTemplates.
  channelLabel(channel: NotificationChannel): string {
    return NOTIFICATION_CHANNEL_LABELS[channel];
  }

  readonly columns: DataTableColumn[] = [
    { key: 'channel', label: 'Canal', width: '110px' },
    { key: 'code', label: 'Código', width: '200px' },
    { key: 'name', label: 'Nombre' },
    { key: 'language', label: 'Idioma', align: 'center', width: '90px' },
    { key: 'scope', label: 'Alcance', align: 'center', width: '110px' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '110px' },
    { key: 'actions', label: '', align: 'right', width: '100px' },
  ];
}
