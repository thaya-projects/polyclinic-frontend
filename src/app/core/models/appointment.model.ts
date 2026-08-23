import { Attachment } from './attachment.model';

export type AppointmentType = 'in-person' | 'video';
export type AppointmentStatus = 'confirmed' | 'in-progress' | 'pending' | 'completed';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientInitials: string;
  doctorId: string;
  doctorName: string;
  date: Date;
  time: string;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  attachments: Attachment[];
  patientNote?: string;
  validityDays?: number;
}
