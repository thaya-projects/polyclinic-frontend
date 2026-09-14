// Campos según ficha "Super Admin — listado de tenants".
// TODO: confirmar contra el schema real (ver doc) cuando se conecte la API.
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  countryCode: string; // ISO 3166-1 alpha-2, ej. 'BO', 'PE'
  plan: TenantPlan;
  status: TenantStatus;
  isActive: boolean;
  createdAt: string; // ISO date
}
