import { TreatmentPlanStatus } from '../models/treatment-plan.model';
import { StatusChipTone } from '../../shared/components/status-chip/status-chip';

export const TREATMENT_PLAN_STATUSES: TreatmentPlanStatus[] = [
  'propuesto',
  'aceptado',
  'en_proceso',
  'completado',
  'cancelado',
];

export const TREATMENT_PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  propuesto: 'Propuesto',
  aceptado: 'Aceptado',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const TREATMENT_PLAN_STATUS_TONES: Record<TreatmentPlanStatus, StatusChipTone> = {
  propuesto: 'neutral',
  aceptado: 'wait',
  en_proceso: 'wait',
  completado: 'ok',
  cancelado: 'danger',
};
