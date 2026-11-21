import { AppointmentStatus } from './appointment.model';
import { InvoiceStatus } from './invoice.model';

// Fase 10 T1: DTOs de reportes de clínica — 4 recursos independientes,
// uno por endpoint real (GET /tenants/reports/appointments|patients|
// invoices|encounters). Nunca incluyen tenant_id (sale del token) ni
// datos clínicos/personales del paciente (patients/encounters van sin PII).
// ⚠️ Ninguno de estos 4 respeta BranchAccess del lado backend todavía
// (bug conocido, no se arregla acá) — un usuario restringido a una
// sucursal los ve igual, de toda la clínica.

export interface ReportDailyBreakdown {
  date: string;
  count: number;
  amount: number | null;
}

export interface ReportProfessionalCount {
  professional_id: string;
  professional_name: string;
  count: number;
}

// --- Appointments ----------------------------------------------------------

export interface AppointmentsReportQuery {
  from: string;
  to: string;
  professional_id?: string;
  status?: AppointmentStatus;
}

export interface AppointmentStatusCount {
  status: AppointmentStatus;
  count: number;
}

export interface AppointmentReportItem {
  id: string;
  patient_id: string;
  professional_id: string;
  branch_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
}

export interface AppointmentsReport {
  total_count: number;
  by_status: AppointmentStatusCount[];
  by_professional: ReportProfessionalCount[];
  daily_breakdown: ReportDailyBreakdown[];
  items: AppointmentReportItem[];
}

// --- Patients ---------------------------------------------------------------

export interface PatientsReportQuery {
  from: string;
  to: string;
  is_active?: boolean;
}

export interface PatientsReport {
  total_count: number;
  daily_breakdown: ReportDailyBreakdown[];
}

// --- Invoices -----------------------------------------------------------------
// Un bloque por moneda — nunca se suman montos de monedas distintas.

export interface InvoicesReportQuery {
  from: string;
  to: string;
  status?: InvoiceStatus;
}

export interface InvoiceStatusCount {
  status: InvoiceStatus;
  count: number;
}

// total_amount == collected + balance siempre.
export interface InvoicesSummaryByCurrency {
  currency: string;
  issued_count: number;
  total_amount: number;
  collected: number;
  balance: number;
}

export interface InvoiceReportItem {
  id: string;
  patient_id: string;
  branch_id: string | null;
  invoice_number: string | null;
  issued_at: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export interface InvoicesReport {
  total_count: number;
  by_status: InvoiceStatusCount[];
  by_currency: InvoicesSummaryByCurrency[];
  daily_breakdown: ReportDailyBreakdown[];
  items: InvoiceReportItem[];
}

// --- Encounters -----------------------------------------------------------
// Siempre cuenta solo notas firmadas (signed) — sin status en el query.

export interface EncountersReportQuery {
  from: string;
  to: string;
  professional_id?: string;
}

export interface EncountersReport {
  status: 'signed';
  total_count: number;
  by_professional: ReportProfessionalCount[];
  daily_breakdown: ReportDailyBreakdown[];
}
