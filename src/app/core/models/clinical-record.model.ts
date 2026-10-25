// Tabla `clinical_record` (T1): blood_type, allergies, chronic_conditions,
// current_medications, family_history, habits. Nada de encounter,
// diagnosis, prescription ni odontograma — eso son otras tablas, fuera de
// alcance acá (y prohibido mostrarlas).
export interface ClinicalRecord {
  // Fase 4: el backend ya lo devuelve (ClinicalRecordDTO.Id); lo usa el alta de encounters
  // (clinical_record_id). Opcional para no romper los usos de fase 3 que no lo necesitan.
  id?: string;
  patient_id: string;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  current_medications: string | null;
  family_history: string | null;
  // jsonb en el backend (objeto clave/valor, default {}): nunca un string.
  habits: ClinicalHabits | null;
}

export type ClinicalHabits = Record<string, unknown>;

export type ClinicalRecordDto = Omit<ClinicalRecord, 'patient_id' | 'id'>;
