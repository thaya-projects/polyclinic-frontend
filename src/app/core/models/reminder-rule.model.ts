import { NotificationChannel } from './notification-template.model';

// Fase 9 T2: v1 solo soporta estos 3 event_type (regla del schema).
export type ReminderEventType = 'appointment_created' | 'appointment_reminder' | 'appointment_cancelled';

export interface ReminderRule {
  id: string;
  event_type: ReminderEventType;
  // negativo = antes del evento, positivo = después (regla del schema:
  // "offset_minutes: negativo = antes del evento. Ejemplo: -1440 = 24h antes").
  offset_minutes: number;
  channel: NotificationChannel;
  // null permitido por el schema (`template_id uuid`, sin not null) —
  // una regla puede existir sin plantilla asignada todavía.
  template_id: string | null;
  is_active: boolean;
}

export interface ReminderRuleDto {
  event_type: ReminderEventType;
  offset_minutes: number;
  channel: NotificationChannel;
  template_id: string | null;
}
