import { TreatmentPlanStatus } from '../models/treatment-plan.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

export const TREATMENT_PLAN_STATUSES: TreatmentPlanStatus[] = [
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
];

export const TREATMENT_PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  proposed: 'Propuesto',
  accepted: 'Aceptado',
  in_progress: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const TREATMENT_PLAN_STATUS_TONES: Record<TreatmentPlanStatus, StatusChipTone> = {
  proposed: 'neutral',
  accepted: 'wait',
  in_progress: 'wait',
  completed: 'ok',
  cancelled: 'danger',
};
