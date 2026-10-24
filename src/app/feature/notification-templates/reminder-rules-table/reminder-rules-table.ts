import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { ReminderRule, ReminderEventType } from '../../../core/models/reminder-rule.model';
import { NotificationChannel } from '../../../core/models/notification-template.model';
import { REMINDER_EVENT_TYPE_LABELS } from '../../../core/constants/reminder-event-type.const';
import { NOTIFICATION_CHANNEL_LABELS } from '../../../core/constants/notification-channel.const';
import { formatOffset } from '../../../shared/utils/reminder-offset.util';

export interface ReminderRuleRow extends ReminderRule {
  template_name: string;
}

// Desacoplada de la fuente de datos (criterio de aceptación T2): recibe
// la lista ya resuelta (con el nombre de plantilla ya armado por el
// contenedor), no sabe de dónde salió.
@Component({
  selector: 'app-reminder-rules-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './reminder-rules-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderRulesTable {
  rules = input.required<ReminderRuleRow[]>();

  view = output<ReminderRule>();

  rows = computed(() => this.rules() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'event_type', label: 'Evento' },
    { key: 'offset_minutes', label: 'Cuándo', width: '160px' },
    { key: 'channel', label: 'Canal', width: '110px' },
    { key: 'template_name', label: 'Plantilla' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '110px' },
    { key: 'actions', label: '', align: 'right', width: '100px' },
  ];

  eventTypeLabel(eventType: ReminderEventType): string {
    return REMINDER_EVENT_TYPE_LABELS[eventType];
  }

  channelLabel(channel: NotificationChannel): string {
    return NOTIFICATION_CHANNEL_LABELS[channel];
  }

  offsetLabel(offsetMinutes: number): string {
    return formatOffset(offsetMinutes);
  }
}
