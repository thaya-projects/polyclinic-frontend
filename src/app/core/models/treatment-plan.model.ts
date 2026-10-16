// Fase 7: plan de tratamiento de un paciente. Solo los campos de
// treatment_plan permitidos por el schema — sin invoice/payment/
// notification (prohibido en esta fase). tenant_id no viaja al frontend
// (sale del token) y created_by se omite: todavía no hay lookup de
// app_user para mostrarlo.
export type TreatmentPlanStatus = 'propuesto' | 'aceptado' | 'en_proceso' | 'completado' | 'cancelado';

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  clinical_record_id: string;
  status: TreatmentPlanStatus;
  total_estimated: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

// Body del alta/edición (T2) — currency opcional: si no viene, el backend
// la completa con tenant.default_currency (regla de negocio del schema).
export interface TreatmentPlanDto {
  notes: string | null;
  currency?: string;
}

// Body de POST /tenants/treatment-plans/:id/status (contrato de Fase 7).
export interface TreatmentPlanStatusChangeDto {
  status: TreatmentPlanStatus;
  note: string | null;
}
