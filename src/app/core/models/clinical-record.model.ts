// Tabla `clinical_record` (T1): blood_type, allergies, chronic_conditions,
// current_medications, family_history, habits. Nada de encounter,
// diagnosis, prescription ni odontograma — eso son otras tablas, fuera de
// alcance acá (y prohibido mostrarlas).
export interface ClinicalRecord {
  patient_id: string;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  current_medications: string | null;
  family_history: string | null;
  habits: string | null;
}

export type ClinicalRecordDto = Omit<ClinicalRecord, 'patient_id'>;
