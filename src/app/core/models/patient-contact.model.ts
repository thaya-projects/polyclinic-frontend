// Tabla `patient_contact` (T1): full_name, relationship, phone, is_primary.
// Solo estos campos — nada de otras tablas de Fase 3.
export interface PatientContact {
  id: string;
  patient_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  is_primary: boolean;
}

// Body de alta (T4/T5) — solo full_name es obligatorio. is_primary no va
// acá: un contacto nuevo nunca se crea ya marcado como principal.
export type PatientContactDto = Pick<PatientContact, 'full_name' | 'relationship' | 'phone'>;

// Body de PATCH (T5) — el ticket no da un endpoint dedicado para "marcar
// como principal", así que esa acción también es un PATCH (parcial, solo
// is_primary). El resto de los campos son igual de opcionales que en el alta.
export type PatientContactUpdateDto = Partial<PatientContactDto> & Partial<Pick<PatientContact, 'is_primary'>>;
