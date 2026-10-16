import { TreatmentPlanItemStatus } from '../models/treatment-plan-item.model';

export const TREATMENT_PLAN_ITEM_STATUSES: TreatmentPlanItemStatus[] = [
  'pendiente',
  'agendado',
  'en_proceso',
  'realizado',
  'cancelado',
];

export const TREATMENT_PLAN_ITEM_STATUS_LABELS: Record<TreatmentPlanItemStatus, string> = {
  pendiente: 'Pendiente',
  agendado: 'Agendado',
  en_proceso: 'En proceso',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};
