export type TreatmentPlanItemStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Fase 6 (odontogram) todavía no está construido en el frontend — este
// enum es el mínimo necesario para treatment_plan_item.surfaces en esta
// fase. Se consolida con el de Fase 6 cuando esa pantalla exista.
export type ToothSurface = 'mesial' | 'distal' | 'vestibular' | 'lingual' | 'oclusal';

// Fase 7 T1/T2: item de un plan de tratamiento. tooth_fdi/surfaces solo
// tienen valor si el tenant tiene el feature odontogram activo — si no,
// siempre van null (criterio de aceptación de T2).
export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  status: TreatmentPlanItemStatus;
  tooth_fdi: number | null;
  surfaces: ToothSurface[] | null;
  // T3: link opcional a una cita YA existente (nunca se crea una acá) +
  // auditoría de cuándo/quién lo marcó "realizado". done_by se guarda
  // como nombre para mostrar directo en el mock — el lookup real de
  // app_user por id es parte de T5.
  appointment_id: string | null;
  done_at: string | null;
  done_by: string | null;
}

export interface TreatmentPlanItemDto {
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tooth_fdi: number | null;
  surfaces: ToothSurface[] | null;
}

// Body de POST .../items/:itemId/status (contrato de Fase 7).
export interface TreatmentPlanItemStatusChangeDto {
  status: TreatmentPlanItemStatus;
  appointment_id: string | null;
}
