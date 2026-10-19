// Fase 9: plantilla de notificación. Solo los campos de
// notification_template permitidos por el schema — sin invoice/payment/
// subscription (prohibido en esta fase).
export type NotificationChannel = 'whatsapp' | 'email' | 'sms';

export interface NotificationTemplate {
  id: string;
  // null = plantilla global de la plataforma (no editable desde acá);
  // con valor = plantilla propia de la clínica.
  tenant_id: string | null;
  channel: NotificationChannel;
  code: string;
  name: string;
  // Nombre/id de la plantilla pre-aprobada del lado del proveedor (ej.
  // WhatsApp Business) — no forma parte del form de esta fase (T1), se
  // deja fuera a propósito (no está en el alcance del ticket).
  provider_template: string | null;
  language: string;
  body: string;
  // Schema: `variables jsonb not null default '[]'` — el backend no fija
  // una forma interna. Acá se modela como array de nombres de placeholder
  // (ej. "patient_name", "appointment_date"), que es lo que usa el form.
  variables: string[];
  is_active: boolean;
  // unique(tenant_id, channel, code) en el backend — el mock de esta
  // fase no lo valida (T1, sin HTTP); T5 va a reflejar el 409 si choca.
}

// Body del alta/edición (T1) — exactamente los campos que pide el
// ticket. channel/code/name son obligatorios (criterio de aceptación).
export interface NotificationTemplateDto {
  channel: NotificationChannel;
  code: string;
  name: string;
  body: string;
  language: string;
  variables: string[];
}
