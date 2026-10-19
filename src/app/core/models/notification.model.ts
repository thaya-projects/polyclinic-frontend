import { NotificationChannel } from './notification-template.model';

export type NotificationStatus = 'pending' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';

// Fase 9 T5: notificación saliente (log de envíos), de solo lectura —
// la genera el backend solo (al crear/cancelar una cita, según
// reminder_rule) y un worker aparte la procesa. Nunca se crea ni se
// edita desde esta UI.
export interface Notification {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
  channel: NotificationChannel;
  template_id: string | null;
  to_address: string;
  status: NotificationStatus;
  scheduled_for: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  attempts: number;
  created_at: string;
}

// GET /tenants/notifications?patient_id=&status=&channel=&from=&to=
export interface NotificationsQuery {
  patient_id?: string;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  from?: string;
  to?: string;
}
