// Fase 4 Recetas T4/T5: espeja PrescriptionDTO / PrescriptionItemDTO (snake_case) de
// /tenants/encounters/:id/prescriptions, /tenants/patients/:patientId/prescriptions y
// /tenants/prescriptions/:id/items. tenant_id no viaja nunca; professional_id, patient_id e
// issued_at los resuelve el backend (URL + token): el frontend jamás los manda en un body.
export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication: string;
  presentation: string | null;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  patient_id: string;
  professional_id: string;
  // null = receta suelta (sin encuentro).
  encounter_id: string | null;
  issued_at: string;
  notes: string | null;
  items: PrescriptionItem[];
}

// POST → 201 PrescriptionDTO + encounter_version (la del encounter incrementada; null si es suelta).
export type CreatedPrescription = Prescription & { encounter_version: number | null };

// POST /tenants/prescriptions/:id/items → 201 PrescriptionItemDTO + encounter_version (null si la
// receta es suelta).
export type CreatedPrescriptionItem = PrescriptionItem & { encounter_version: number | null };

// Body de un ítem (alta inicial o "Agregar medicamento"). medication obligatorio; el resto opcional.
export interface CreatePrescriptionItemDto {
  medication: string;
  presentation?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

// Body del alta (en un encuentro o suelta). Nunca tenant_id, professional_id, patient_id ni issued_at.
export interface CreatePrescriptionDto {
  notes?: string | null;
  items?: CreatePrescriptionItemDto[];
}

// GET /tenants/patients/:patientId/prescriptions?page=&limit= (PagedResult, issued_at desc).
export interface PrescriptionsQuery {
  page: number;
  limit: number;
}

export const PRESCRIPTION_LIMITS = {
  medication: 200,
  presentation: 200,
  dose: 200,
  frequency: 200,
  duration: 200,
  instructions: 1000,
  notes: 2000,
  maxItems: 50,
  // Una receta suelta admite ítems nuevos solo durante 24 h desde issued_at.
  standaloneItemWindowMs: 24 * 60 * 60 * 1000,
} as const;

// Campos opcionales de texto corto del ítem (mismo límite: 200).
export const PRESCRIPTION_ITEM_SHORT_FIELDS = ['presentation', 'dose', 'frequency', 'duration'] as const;

export const PRESCRIPTION_ITEM_FIELD_LABEL: Record<keyof CreatePrescriptionItemDto, string> = {
  medication: 'Medicamento',
  presentation: 'Presentación',
  dose: 'Dosis',
  frequency: 'Frecuencia',
  duration: 'Duración',
  instructions: 'Indicaciones',
};

// Ventana de 24 h de una receta suelta según el reloj del cliente. Solo informativo (el reloj local
// puede estar adelantado): decide el backend, que acepta hasta exactamente issued_at + 24 h.
export function isWithinStandaloneItemWindow(issuedAt: string, now: number = Date.now()): boolean {
  const issued = Date.parse(issuedAt);
  if (Number.isNaN(issued)) return false;
  return now - issued <= PRESCRIPTION_LIMITS.standaloneItemWindowMs;
}
