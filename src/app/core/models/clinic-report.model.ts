import { AppointmentStatus } from './appointment.model';
import { InvoiceStatus } from './invoice.model';

// Fase 10 T1: DTOs de reportes de clínica — 4 recursos independientes,
// uno por endpoint real (GET /tenants/reports/appointments|patients|
// invoices|encounters). Nunca incluyen tenant_id (sale del token, los
// reportes de clínica nunca lo aceptan por query) ni datos clínicos/
// personales del paciente (prohibido en esta fase).

export interface AppointmentsReportQuery {
  from: string;
  to: string;
  professional_id?: string;
  status?: AppointmentStatus;
}

export interface AppointmentsByStatusSummary {
  status: AppointmentStatus;
  count: number;
}

export interface PatientsReportQuery {
  from: string;
  to: string;
}

// Un bloque por moneda — nunca se suman montos de monedas distintas
// (criterio de aceptación: "sin mezclar monedas").
export interface InvoicesReportQuery {
  from: string;
  to: string;
  status?: InvoiceStatus;
}

export interface InvoicesSummaryByCurrency {
  currency: string;
  issued_count: number;
  issued_total: number;
  collected_total: number;
  balance_total: number;
}

export interface EncountersReportQuery {
  from: string;
  to: string;
  professional_id?: string;
}
