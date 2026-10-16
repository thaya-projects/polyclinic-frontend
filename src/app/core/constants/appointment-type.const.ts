import { AppointmentType } from '../models/appointment.model';

export const APPOINTMENT_TYPES: AppointmentType[] = ['in_person', 'online', 'hybrid'];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  in_person: 'Presencial',
  online: 'Online',
  hybrid: 'Híbrida',
};
