import { ReminderEventType } from '../models/reminder-rule.model';

export const REMINDER_EVENT_TYPES: ReminderEventType[] = [
  'appointment_created',
  'appointment_reminder',
  'appointment_cancelled',
];

export const REMINDER_EVENT_TYPE_LABELS: Record<ReminderEventType, string> = {
  appointment_created: 'Cita creada',
  appointment_reminder: 'Recordatorio de cita',
  appointment_cancelled: 'Cita cancelada',
};
