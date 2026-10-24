import { TenantStatus } from './tenant.model';

// El backend devuelve GET/POST/PATCH /superadmin/tenants(/:id) y los /suspend|/activate como
// TenantDetailDTO: { tenant: {...}, subscription: {...} | null, first_users: [...] } — un
// envoltorio de 3 claves, nada parecido a un objeto plano. TenantsApi es quien aplana esta forma
// real hacia TenantDetail (abajo) para no tener que reescribir cada componente que ya esperaba
// un objeto plano.
export interface RawTenantSubscription {
  status: TenantStatus;
  plan_id: string;
  plan_name: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

// AppUserSummaryDTO real del backend: { id, full_name, email, is_active } — SIN role ni
// created_at (el frontend anterior los esperaba, pero esos 2 campos no existen en el backend;
// no se inventan, se sacaron del modelo y de la vista).
export interface RawAppUserSummary {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface RawTenantDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    country_code: string;
    default_currency: string;
    default_timezone: string;
    locale: string;
    tax_id: string | null;
    legal_name: string | null;
    billing_email: string | null;
    billing_address: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  subscription: RawTenantSubscription | null;
  first_users: RawAppUserSummary[];
}

export type AppUserSummary = RawAppUserSummary;
export type TenantSubscription = RawTenantSubscription;

// Forma aplanada que consumen los componentes de UI — subscription puede ser null (tenant sin
// ninguna subscription todavía), first_app_user es el primero de first_users (normalmente hay
// exactamente uno, el admin creado junto con el tenant) o null si por algún motivo no hay
// ninguno.
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
  billing_email: string | null;
  billing_address: string | null;
  is_active: boolean;
  created_at: string;
  subscription: TenantSubscription | null;
  first_app_user: AppUserSummary | null;
}

export function toTenantDetail(raw: RawTenantDetail): TenantDetail {
  return {
    ...raw.tenant,
    subscription: raw.subscription,
    first_app_user: raw.first_users[0] ?? null,
  };
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
