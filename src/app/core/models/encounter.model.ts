// Fase 4 T6/T7: espeja EncounterDTO (snake_case) de /tenants/encounters. tenant_id no viaja.
// signed_by/voided_by son ids de app_user que SIEMPRE salen del token en el backend — el
// frontend nunca los manda en un body (ver CreateEncounterDto/UpdateEncounterDto/VoidEncounterDto).
export type EncounterStatus = 'open' | 'signed' | 'voided';

export interface Encounter {
  id: string;
  clinical_record_id: string;
  patient_id: string;
  professional_id: string;
  appointment_id: string | null;
  specialty_id: string | null;
  form_template_id: string | null;
  encounter_date: string;
  chief_complaint: string | null;
  anamnesis: string | null;
  exam: string | null;
  clinical_data: Record<string, unknown>;
  status: EncounterStatus;
  signed_at: string | null;
  signed_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  // Concurrencia optimista: PATCH/sign/void la mandan; versión vieja → 409, ausente → 422.
  version: number;
}

// Ítem de GET /tenants/encounters (EncounterSummaryDTO): sin anamnesis/exam/clinical_data (ni
// clinical_record_id, form_template_id, signed_by, voided_by, void_reason). El contenido completo
// solo viene en GET /tenants/encounters/:id (Encounter).
export interface EncounterSummary {
  id: string;
  patient_id: string;
  professional_id: string;
  appointment_id: string | null;
  specialty_id: string | null;
  encounter_date: string;
  status: EncounterStatus;
  chief_complaint: string | null;
  signed_at: string | null;
  voided_at: string | null;
  created_at: string;
  version: number;
}

// Nueva version del encounter tras el alta/baja de un hijo clínico (diagnóstico, medición): el
// backend la incrementa y el detalle la aplica en memoria.
export interface EncounterVersionChange {
  encounterId: string;
  version: number;
}

// Permiso que habilita leer encounters sin ser profesional y la anulación administrativa.
export const CLINICAL_VOID_PERMISSION = 'clinical.void';

// POST /tenants/encounters. encounter_date ausente = ahora (server); si viene, con offset y no futura.
export interface CreateEncounterDto {
  patient_id: string;
  clinical_record_id: string;
  professional_id: string;
  appointment_id?: string | null;
  specialty_id?: string | null;
  form_template_id?: string | null;
  encounter_date?: string | null;
  chief_complaint?: string | null;
  anamnesis?: string | null;
  exam?: string | null;
  clinical_data?: Record<string, unknown> | null;
}

// Campos clínicos editables (lo que emite la nota). El PATCH real agrega `version`.
export interface EncounterNotePatch {
  chief_complaint?: string | null;
  anamnesis?: string | null;
  exam?: string | null;
}

// PATCH tri-state: campo ausente = no tocar, null = vaciar. Solo campos clínicos + version.
export interface UpdateEncounterDto {
  version: number;
  chief_complaint?: string | null;
  anamnesis?: string | null;
  exam?: string | null;
  clinical_data?: Record<string, unknown>;
}

// POST /tenants/encounters/:id/sign — solo version; signed_by sale del token.
export interface SignEncounterDto {
  version: number;
}

// POST /tenants/encounters/:id/void — reason obligatorio (1-500) + version; voided_by sale del token.
export interface VoidEncounterDto {
  reason: string;
  version: number;
}

// GET /tenants/encounters?patient_id=&professional_id=&status=&page=&limit=
export interface EncountersQuery {
  patient_id?: string;
  professional_id?: string;
  status?: EncounterStatus;
  page: number;
  limit: number;
}

// Opciones para los selects de paciente/profesional del alta y los filtros.
export interface EncounterPartyOption {
  id: string;
  // Nombre a secas (tablas, encabezados) y texto completo para selects (nombre + documento).
  name: string;
  label: string;
  // Solo profesionales: app_user vinculado (para mostrar "firmado por" con nombre).
  user_id?: string | null;
}

export const ENCOUNTER_LIMITS = {
  chief_complaint: 500,
  anamnesis: 20000,
  exam: 20000,
  void_reason: 500,
} as const;

export const ENCOUNTER_STATUS_LABEL: Record<EncounterStatus, string> = {
  open: 'Abierto',
  signed: 'Firmado',
  voided: 'Anulado',
};
