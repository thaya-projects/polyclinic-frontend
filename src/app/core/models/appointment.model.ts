import { Patient } from './patient.model';
import { Service } from './service.model';

// Opciones livianas para los selects del form de cita — mismo shape que
// los campos reales de Patient/Service, pero con datos mock propios de
// este ticket (no se conecta a PatientsService/ServicesService reales,
// que ya están conectadas a HTTP real en sus propios módulos).
export type AppointmentPatientOption = Pick<Patient, 'id' | 'first_name' | 'last_name'>;
export type AppointmentServiceOption = Pick<Service, 'id' | 'name' | 'duration_minutes'>;

// Estados del ciclo de vida de una cita (T1: contrato status + history).
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Tipo de cita (T1, campos online): presencial, online o híbrida.
export type AppointmentType = 'in_person' | 'online' | 'hybrid';

// Tabla `appointment` (T1, Fase 4): branch_id, patient_id, professional_id,
// service_id, room_id, starts_at, ends_at, reason, notes, status,
// confirmed_at, type, meeting_url, meeting_provider.
//
// status/confirmed_at/cancelled_reason/type/meeting_url/meeting_provider
// quedan opcionales a propósito: el listado real (GET /tenants/appointments,
// conectado desde su propio ticket) no necesariamente los devuelve todavía
// — tanto el cambio de estado como los campos online se construyeron mock,
// sin tocar ese flujo HTTP hasta que su propio ticket de conexión lo pida.
export interface Appointment {
  id: string;
  branch_id: string;
  patient_id: string;
  professional_id: string;
  service_id: string;
  room_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  notes: string | null;
  status?: AppointmentStatus;
  confirmed_at?: string | null;
  cancelled_reason?: string | null;
  type?: AppointmentType;
  meeting_url?: string | null;
  meeting_provider?: string | null;
}

// El form de alta/edición (T5/T6 de agenda) no toca status/confirmed_at/
// cancelled_reason — eso se maneja exclusivamente desde el panel de
// cambio de estado.
export type AppointmentDto = Omit<Appointment, 'id' | 'status' | 'confirmed_at' | 'cancelled_reason'>;

// GET /tenants/appointments?from=&to=&professional_id=&branch_id=&patient_id=&status= (T6)
// patient_id/status no se exponen en esta UI (T5 no tiene filtro de
// paciente, y cambio de estado queda fuera de alcance) — se dejan
// opcionales para no cerrarle la puerta al contrato si se agregan después.
export interface AppointmentsQuery {
  from: string;
  to: string;
  professional_id?: string;
  branch_id?: string;
  patient_id?: string;
  status?: string;
}
