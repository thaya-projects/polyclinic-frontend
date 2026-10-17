// Fase 4 T4/T5: espeja DiagnosisDTO de /tenants/encounters/:id/diagnoses. tenant_id no viaja
// (ni en respuestas ni en bodies): el backend lo resuelve desde el token.
export interface Diagnosis {
  id: string;
  encounter_id: string;
  cie10_code: string | null;
  description: string;
  is_definitive: boolean;
  created_at: string;
}

// Agregar o borrar un diagnóstico incrementa la version del encounter: las respuestas traen la
// nueva (`encounter_version`) y el detalle la aplica en memoria, si no el próximo Guardar/Firmar
// daría un 409 falso. POST → 201 DiagnosisDTO + encounter_version; DELETE → 200 { encounter_version }.
export type CreatedDiagnosis = Diagnosis & { encounter_version: number };
export interface DeleteDiagnosisResult {
  encounter_version: number;
}

// POST /tenants/encounters/:id/diagnoses. Si viene cie10_code sin description, el backend completa
// la description desde el CIE-10; sin ninguna de las dos → 422. cie10_code inexistente → 422.
export interface CreateDiagnosisDto {
  cie10_code?: string | null;
  description?: string | null;
  is_definitive?: boolean;
}

// Ítem de GET /tenants/cie10?q=&limit= (catálogo global, cualquier usuario del tenant).
export interface Cie10Entry {
  code: string;
  description: string;
}

export const DIAGNOSIS_LIMITS = {
  description: 1000,
} as const;

// q < 2 o > 100 caracteres → 422 en el backend (Cie10SearchQuery): el buscador no sale fuera de rango.
export const CIE10_SEARCH = {
  minChars: 2,
  maxChars: 100,
  defaultLimit: 20,
  maxLimit: 50,
  debounceMs: 300,
} as const;
