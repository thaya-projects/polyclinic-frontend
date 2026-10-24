import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ClinicReportsFilters } from '../clinic-reports-filters/clinic-reports-filters';
import { PatientsReportCard } from '../patients-report-card/patients-report-card';
import { EncountersReportCard } from '../encounters-report-card/encounters-report-card';
import { AppointmentsByStatusCard } from '../appointments-by-status-card/appointments-by-status-card';
import { InvoicesSummaryCard } from '../invoices-summary-card/invoices-summary-card';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toIsoDate(date);
}

// Sección delgada: solo es dueña del rango de fechas (el único filtro
// realmente compartido entre los 4 endpoints de reportes) y se lo pasa a
// cada card — cada una arma su propio query con sus filtros locales
// (profesional/status) y llama a su propio servicio.
@Component({
  selector: 'app-clinic-reports-summary-section',
  imports: [ClinicReportsFilters, PatientsReportCard, EncountersReportCard, AppointmentsByStatusCard, InvoicesSummaryCard],
  templateUrl: './clinic-reports-summary-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClinicReportsSummarySection {
  from = signal(defaultFrom());
  to = signal(toIsoDate(new Date()));
}
