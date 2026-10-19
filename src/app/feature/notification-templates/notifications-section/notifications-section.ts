import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NotificationsTable, NotificationRow } from '../notifications-table/notifications-table';
import { NotificationsFilters } from '../notifications-filters/notifications-filters';
import { NotificationsService } from '../../../core/services/notifications.service';
import { NotificationTemplatesService } from '../../../core/services/notification-templates.service';
import { NotificationOptionsService } from '../../../core/services/notification-options.service';
import { NotificationStatus, NotificationsQuery } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notifications-section',
  imports: [NotificationsTable, NotificationsFilters],
  templateUrl: './notifications-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsSection {
  private notificationsSvc = inject(NotificationsService);
  private templatesSvc = inject(NotificationTemplatesService);
  private optionsSvc = inject(NotificationOptionsService);

  private allNotifications = this.notificationsSvc.getAll();
  readonly listLoading = this.notificationsSvc.loading;
  readonly listError = this.notificationsSvc.error;
  private templates = this.templatesSvc.getAll();
  private patients = this.optionsSvc.patients();

  search = signal('');
  filterValues = signal<Record<string, string>>({});
  dateFrom = signal('');
  dateTo = signal('');

  private readonly query = computed<NotificationsQuery>(() => ({
    patient_id: this.filterValues()['patient_id'] || undefined,
    status: (this.filterValues()['status'] as NotificationStatus) || undefined,
    channel: (this.filterValues()['channel'] as NotificationsQuery['channel']) || undefined,
    from: this.dateFrom() || undefined,
    to: this.dateTo() || undefined,
  }));

  // Join local con pacientes/plantillas — solo para mostrar nombre, nunca
  // la fuente de verdad (esos siguen siendo patient_id/template_id).
  readonly rows = computed<NotificationRow[]>(() => {
    const term = this.search().toLowerCase().trim();
    return this.allNotifications()
      .filter(n => !term || n.to_address.toLowerCase().includes(term))
      .map(n => {
        const patient = n.patient_id ? this.patients().find(p => p.id === n.patient_id) : null;
        const template = n.template_id ? this.templates().find(t => t.id === n.template_id) : null;
        return { ...n, patient_name: patient ? `${patient.first_name} ${patient.last_name}` : null, template_name: template?.name ?? '—' };
      });
  });

  constructor() {
    this.templatesSvc.load();

    // GET /tenants/notifications?patient_id=&status=&channel=&from=&to=
    effect(() => {
      this.notificationsSvc.load(this.query());
    });
  }
}
