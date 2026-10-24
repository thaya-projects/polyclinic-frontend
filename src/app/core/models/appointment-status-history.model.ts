import { Appointment, AppointmentStatus } from './appointment.model';

// Tabla `appointment_status_history` (T1): from_status, to_status, note,
// changed_at. from_status es null para el primer registro (alta de la cita).
export interface AppointmentStatusHistoryEntry {
  id: string;
  appointment_id: string;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  note: string | null;
  changed_at: string;
}

// GET /tenants/appointments/:id (T6): el detalle de la cita trae el
// historial embebido. Se define acá (no en appointment.model.ts) para no
// generar un import circular entre ambos archivos de modelo.
export interface AppointmentDetail extends Appointment {
  status_history: AppointmentStatusHistoryEntry[];
}

// Body de POST /tenants/appointments/:id/status (T6) — mismo shape que
// emite AppointmentStatusForm (T5), sin tenant_id.
export interface AppointmentStatusChangeDto {
  to_status: AppointmentStatus;
  note: string | null;
  cancelled_reason: string | null;
}
