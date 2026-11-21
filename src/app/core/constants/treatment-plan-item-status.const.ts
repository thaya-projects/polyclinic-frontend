import { TreatmentPlanItemStatus } from '../models/treatment-plan-item.model';

export const TREATMENT_PLAN_ITEM_STATUSES: TreatmentPlanItemStatus[] = [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
];

export const TREATMENT_PLAN_ITEM_STATUS_LABELS: Record<TreatmentPlanItemStatus, string> = {
  pending: 'Pendiente',
  scheduled: 'Agendado',
  in_progress: 'En proceso',
  completed: 'Realizado',
  cancelled: 'Cancelado',
};
