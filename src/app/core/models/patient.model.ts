// Tabla `patient` (T1): first_name, last_name, document_type,
// document_number, birth_date, sex, whatsapp_phone, phone_alt, email,
// address, notes, is_active. Solo estos campos — nada de otras tablas de
// Fase 3 (professional, appointment, invoice, odontogram, notification).
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string;
  birth_date: string | null;
  sex: string;
  whatsapp_phone: string;
  phone_alt: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

// Body del alta/edición (T6/T7) — solo first_name/last_name son
// obligatorios; el resto queda opcional en el form. is_active no va acá:
// se maneja con el endpoint dedicado de deactivate (T7).
export type CreatePatientDto = Omit<Patient, 'id' | 'is_active'>;

// GET /tenants/patients?q=&document=&page=&limit= (T7)
export interface PatientsQuery {
  q?: string;
  document?: string;
  page: number;
  limit: number;
}

// Respuesta paginada del listado — shape asumido (items/total) a falta de
// poder verificarlo en vivo; el backend de /tenants/patients todavía no
// está desplegado en el entorno de desarrollo (ver aviso en el resumen).
export interface PatientsPageResult {
  items: Patient[];
  total: number;
}
