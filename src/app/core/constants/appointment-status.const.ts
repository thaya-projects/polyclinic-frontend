import { AppointmentStatus } from '../models/appointment.model';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  checked_in: 'Paciente en recepción',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No se presentó',
};

// Estados terminales: no se puede volver a "scheduled" desde acá (criterio
// de aceptación — una cita completada/cancelada no se reabre).
const TERMINAL_STATUSES: AppointmentStatus[] = ['completed', 'cancelled'];

export function statusOptionsFor(currentStatus: AppointmentStatus): AppointmentStatus[] {
  if (!TERMINAL_STATUSES.includes(currentStatus)) return APPOINTMENT_STATUSES;
  return APPOINTMENT_STATUSES.filter(s => s !== 'scheduled');
}
