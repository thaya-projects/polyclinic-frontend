// Fila de GET /superadmin/tenants (TenantListItemDTO en el backend) — forma real confirmada
// contra la API (antes era un schema especulativo sin conectar, ver historial de git).
// TenantStatus refleja Domain.Enums.SubscriptionStatus (backend), serializado snake_case-lower —
// null cuando el tenant no tiene ninguna subscription (puede pasar, ej. tenants sembrados antes
// de que existiera el módulo de subscripciones).
export type TenantStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

// El plan NO es un enum fijo en el backend (SubscriptionPlan es una tabla real, con nombres
// libres como "Test Plan", "Pro", etc.) — se muestra tal cual viene en `plan_name`, null si no
// hay subscription.
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  countryCode: string; // ISO 3166-1 alpha-2, ej. 'BO', 'PE'
  plan: string | null;
  status: TenantStatus | null;
  isActive: boolean;
  createdAt: string; // ISO date
}
