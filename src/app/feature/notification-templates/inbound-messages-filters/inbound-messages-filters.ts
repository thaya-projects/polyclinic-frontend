import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { ListFilters } from '../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../shared/components/list-filters/list-filter.model';
import { PatientsService } from '../../../core/services/patients.service';

const PROCESSED_OPTIONS = [
  { value: 'true', label: 'Procesado' },
  { value: 'false', label: 'Sin procesar' },
];

@Component({
  selector: 'app-inbound-messages-filters',
  imports: [ListFilters],
  templateUrl: './inbound-messages-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboundMessagesFilters {
  private patientsSvc = inject(PatientsService);
  private patients = this.patientsSvc.getAll();

  // El search es parte del componente compartido ListFilters (siempre se
  // muestra) — lo uso para buscar por número/texto del mensaje, aunque
  // el ticket solo pide paciente/procesado/fecha explícitamente.
  search = model('');
  values = model<Record<string, string>>({});
  dateFrom = model('');
  dateTo = model('');

  private readonly patientOptions = computed(() =>
    this.patients().map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  );

  readonly filterConfigs = computed<ListFilterConfig[]>(() => [
    { key: 'patient_id', label: 'Paciente', options: this.patientOptions() },
    { key: 'processed', label: 'Estado', options: PROCESSED_OPTIONS },
  ]);

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
  }
}
