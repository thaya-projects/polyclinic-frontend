import { TenantPlan, TenantStatus } from './tenant.model';

export interface TenantSubscription {
  plan_id: TenantPlan;
  status: TenantStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export interface AppUserSummary {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

// Snake_case a propósito: calza con el schema real (ver doc / T17).
export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  default_currency: string;
  default_timezone: string;
  locale: string;
  tax_id: string | null;
  legal_name: string | null;
  billing_email: string;
  billing_address: string | null;
  is_active: boolean;
  created_at: string;
  subscription: TenantSubscription;
  first_app_user: AppUserSummary | null;
}

// Campos editables desde EditTenantForm — sin plan_id/trial_days (fuera de
// alcance cambiar plan), sin is_active (se maneja con suspender/activar) y
// sin nada de first_admin/password_hash (fuera de alcance, y prohibido por
// el criterio de aceptación de T17).
export type EditTenantDto = Pick<
  TenantDetail,
  | 'name'
  | 'slug'
  | 'country_code'
  | 'default_currency'
  | 'default_timezone'
  | 'locale'
  | 'legal_name'
  | 'tax_id'
  | 'billing_email'
  | 'billing_address'
>;
