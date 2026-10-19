import { NotificationChannel } from '../models/notification-template.model';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['whatsapp', 'email', 'sms'];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
};

export const NOTIFICATION_CHANNEL_ICONS: Record<NotificationChannel, string> = {
  whatsapp: 'brand-whatsapp',
  email: 'mail',
  sms: 'message',
};

export const NOTIFICATION_LANGUAGES = ['es', 'en', 'pt'];
