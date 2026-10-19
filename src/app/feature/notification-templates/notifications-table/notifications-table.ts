import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { Notification, NotificationStatus } from '../../../core/models/notification.model';
import { NotificationChannel } from '../../../core/models/notification-template.model';
import { NOTIFICATION_STATUS_LABELS, NOTIFICATION_STATUS_TONES } from '../../../core/constants/notification-status.const';
import { NOTIFICATION_CHANNEL_LABELS } from '../../../core/constants/notification-channel.const';

export type NotificationRow = Notification & { patient_name: string | null; template_name: string };

// Solo lectura (criterio de aceptación: "notificaciones salientes...
// listados de solo lectura") — sin ninguna acción, desacoplada de la
// fuente de datos.
@Component({
  selector: 'app-notifications-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './notifications-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsTable {
  notifications = input.required<NotificationRow[]>();

  rows = computed(() => this.notifications() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'to_address', label: 'Destinatario', width: '140px' },
    { key: 'patient_name', label: 'Paciente', width: '160px' },
    { key: 'channel', label: 'Canal', width: '100px' },
    { key: 'template_name', label: 'Plantilla' },
    { key: 'status', label: 'Estado', align: 'center', width: '120px' },
    { key: 'scheduled_for', label: 'Programada', width: '140px' },
    { key: 'attempts', label: 'Intentos', align: 'center', width: '90px' },
  ];

  channelLabel(channel: NotificationChannel): string {
    return NOTIFICATION_CHANNEL_LABELS[channel];
  }

  statusLabel(status: NotificationStatus): string {
    return NOTIFICATION_STATUS_LABELS[status];
  }

  statusTone(status: NotificationStatus) {
    return NOTIFICATION_STATUS_TONES[status];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
