import { ChangeDetectionStrategy, Component, model } from '@angular/core';

// Único filtro realmente global entre los 4 endpoints de reportes
// (profesional/status son propios de cada card — el schema solo les da
// esos params a appointments/invoices/encounters, no a patients).
@Component({
  selector: 'app-clinic-reports-filters',
  imports: [],
  templateUrl: './clinic-reports-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicReportsFilters {
  from = model.required<string>();
  to = model.required<string>();

  onFromChange(value: string): void {
    this.from.set(value);
  }

  onToChange(value: string): void {
    this.to.set(value);
  }
}
