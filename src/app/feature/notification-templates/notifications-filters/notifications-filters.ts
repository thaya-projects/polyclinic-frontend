import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { ListFilters } from '../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../shared/components/list-filters/list-filter.model';
import { PatientsService } from '../../../core/services/patients.service';
import { NOTIFICATION_CHANNELS, NOTIFICATION_CHANNEL_LABELS } from '../../../core/constants/notification-channel.const';
import { NOTIFICATION_STATUSES, NOTIFICATION_STATUS_LABELS, NOTIFICATION_STATUS_TONES } from '../../../core/constants/notification-status.const';

const STATUS_OPTIONS = NOTIFICATION_STATUSES.map(value => ({
  value,
  label: NOTIFICATION_STATUS_LABELS[value],
  tone: NOTIFICATION_STATUS_TONES[value],
}));

const CHANNEL_OPTIONS = NOTIFICATION_CHANNELS.map(value => ({ value, label: NOTIFICATION_CHANNEL_LABELS[value] }));

@Component({
  selector: 'app-notifications-filters',
  imports: [ListFilters],
  templateUrl: './notifications-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsFilters {
  private patientsSvc = inject(PatientsService);
  private patients = this.patientsSvc.getAll();

  // Igual criterio que en mensajes entrantes: ListFilters siempre muestra
  // el buscador, así que lo uso para texto libre sobre to_address.
  search = model('');
  values = model<Record<string, string>>({});
  dateFrom = model('');
  dateTo = model('');

  private readonly patientOptions = computed(() =>
    this.patients().map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  );

  readonly filterConfigs = computed<ListFilterConfig[]>(() => [
    { key: 'patient_id', label: 'Paciente', options: this.patientOptions() },
    { key: 'status', label: 'Estado', options: STATUS_OPTIONS },
    { key: 'channel', label: 'Canal', options: CHANNEL_OPTIONS },
  ]);

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
  }
}
