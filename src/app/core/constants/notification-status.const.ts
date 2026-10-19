import { NotificationStatus } from '../models/notification.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  'pending',
  'scheduled',
  'sending',
  'sent',
  'delivered',
  'read',
  'failed',
  'cancelled',
];

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: 'Pendiente',
  scheduled: 'Programada',
  sending: 'Enviando',
  sent: 'Enviada',
  delivered: 'Entregada',
  read: 'Leída',
  failed: 'Falló',
  cancelled: 'Cancelada',
};

export const NOTIFICATION_STATUS_TONES: Record<NotificationStatus, StatusChipTone> = {
  pending: 'neutral',
  scheduled: 'neutral',
  sending: 'wait',
  sent: 'wait',
  delivered: 'ok',
  read: 'ok',
  failed: 'danger',
  cancelled: 'neutral',
};
