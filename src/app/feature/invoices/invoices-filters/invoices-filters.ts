import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { ListFilters } from '../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../shared/components/list-filters/list-filter.model';
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONES } from '../../../core/constants/invoice-status.const';
import { InvoiceOptionsService } from '../../../core/services/invoice-options.service';

const STATUS_OPTIONS = INVOICE_STATUSES.map(value => ({
  value,
  label: INVOICE_STATUS_LABELS[value],
  tone: INVOICE_STATUS_TONES[value],
}));

@Component({
  selector: 'app-invoices-filters',
  imports: [ListFilters],
  templateUrl: './invoices-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesFilters {
  private optionsSvc = inject(InvoiceOptionsService);
  private patients = this.optionsSvc.patients();

  search = model('');
  values = model<Record<string, string>>({});
  dateFrom = model('');
  dateTo = model('');

  // "patient_id" como dropdown (no texto libre): así el filtro arma
  // directo el query param que va a usar GET /tenants/invoices?patient_id=
  // cuando T5 lo conecte — nunca un substring de nombre.
  private readonly patientOptions = computed(() =>
    this.patients().map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  );

  readonly filterConfigs = computed<ListFilterConfig[]>(() => [
    { key: 'patient_id', label: 'Paciente', options: this.patientOptions() },
    { key: 'status', label: 'Estado', options: STATUS_OPTIONS },
  ]);

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
  }
}
