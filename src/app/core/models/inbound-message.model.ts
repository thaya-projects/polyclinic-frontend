import { NotificationChannel } from './notification-template.model';

// Fase 9 T4: mensaje entrante, de solo lectura en esta fase — no se
// responde ni se confirma una cita desde acá (prohibido en v1; el schema
// mismo lo aclara: "v1 inbound: solo persistir").
export interface InboundMessage {
  id: string;
  channel: NotificationChannel;
  from_address: string;
  // null = no se pudo matchear con ningún paciente (ej. número
  // desconocido) — se tiene que distinguir claramente en la UI (criterio
  // de aceptación).
  patient_id: string | null;
  body: string | null;
  provider_message_id: string | null;
  received_at: string;
  processed: boolean;
}

// GET /tenants/inbound-messages?patient_id=&processed=&from=&to= (T5,
// SCRUM-104) — ruta y params inferidos por convención, el schema de esta
// fase no trae una sección de Endpoints literal.
export interface InboundMessagesQuery {
  patient_id?: string;
  processed?: boolean;
  from?: string;
  to?: string;
}
