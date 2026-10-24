import { AppointmentStatus } from '../models/appointment.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

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

// Fase 10: tono por status, para las cards de reportes (StatusChip) —
// antes no existía ningún mapeo de color para estados de cita.
export const APPOINTMENT_STATUS_TONES: Record<AppointmentStatus, StatusChipTone> = {
  scheduled: 'neutral',
  confirmed: 'wait',
  checked_in: 'wait',
  in_progress: 'wait',
  completed: 'ok',
  cancelled: 'danger',
  no_show: 'danger',
};

// Estados terminales: no se puede volver a "scheduled" desde acá (criterio
// de aceptación — una cita completada/cancelada no se reabre).
const TERMINAL_STATUSES: AppointmentStatus[] = ['completed', 'cancelled'];

export function statusOptionsFor(currentStatus: AppointmentStatus): AppointmentStatus[] {
  if (!TERMINAL_STATUSES.includes(currentStatus)) return APPOINTMENT_STATUSES;
  return APPOINTMENT_STATUSES.filter(s => s !== 'scheduled');
}
