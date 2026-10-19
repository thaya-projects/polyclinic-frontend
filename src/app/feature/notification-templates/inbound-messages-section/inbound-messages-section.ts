import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { InboundMessagesTable, InboundMessageRow } from '../inbound-messages-table/inbound-messages-table';
import { InboundMessagesFilters } from '../inbound-messages-filters/inbound-messages-filters';
import { InboundMessagesService } from '../../../core/services/inbound-messages.service';
import { NotificationOptionsService } from '../../../core/services/notification-options.service';
import { InboundMessagesQuery } from '../../../core/models/inbound-message.model';

@Component({
  selector: 'app-inbound-messages-section',
  imports: [InboundMessagesTable, InboundMessagesFilters],
  templateUrl: './inbound-messages-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboundMessagesSection {
  private inboundSvc = inject(InboundMessagesService);
  private optionsSvc = inject(NotificationOptionsService);

  private allMessages = this.inboundSvc.getAll();
  readonly listLoading = this.inboundSvc.loading;
  readonly listError = this.inboundSvc.error;
  private patients = this.optionsSvc.patients();

  search = signal('');
  filterValues = signal<Record<string, string>>({});
  dateFrom = signal('');
  dateTo = signal('');

  private readonly query = computed<InboundMessagesQuery>(() => ({
    patient_id: this.filterValues()['patient_id'] || undefined,
    processed: this.filterValues()['processed'] ? this.filterValues()['processed'] === 'true' : undefined,
    from: this.dateFrom() || undefined,
    to: this.dateTo() || undefined,
  }));

  // Join local con pacientes — distingue claramente los mensajes sin
  // paciente asociado (criterio de aceptación de T4).
  readonly rows = computed<InboundMessageRow[]>(() => {
    const term = this.search().toLowerCase().trim();
    return this.allMessages()
      .filter(row => !term || row.from_address.toLowerCase().includes(term) || !!row.body?.toLowerCase().includes(term))
      .map(msg => {
        const patient = msg.patient_id ? this.patients().find(p => p.id === msg.patient_id) : null;
        return { ...msg, patient_name: patient ? `${patient.first_name} ${patient.last_name}` : null };
      });
  });

  constructor() {
    // GET /tenants/inbound-messages?patient_id=&processed=&from=&to=
    effect(() => {
      this.inboundSvc.load(this.query());
    });
  }
}
