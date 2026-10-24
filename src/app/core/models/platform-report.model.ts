import { TenantStatus } from './tenant.model';

// Fase 10 T3: DTOs de reportes de plataforma (solo superadmin). Sin datos
// clínicos ni de pacientes (prohibido en esta fase) — son agregados a
// nivel tenant/subscripción únicamente.

export interface TenantsByCountry {
  country_code: string;
  count: number;
}

export interface TenantsReportSummary {
  active_count: number;
  suspended_count: number;
  by_country: TenantsByCountry[];
}

export interface SubscriptionsByStatus {
  status: TenantStatus;
  count: number;
}

export interface SubscriptionsByPlan {
  plan_id: string;
  plan_name: string;
  count: number;
}

export interface SubscriptionsReportSummary {
  by_status: SubscriptionsByStatus[];
  by_plan: SubscriptionsByPlan[];
}

// Un bloque por moneda — nunca se suman montos de monedas distintas
// (mismo criterio que Facturación/Reportes de clínica).
export interface MrrByCurrency {
  currency: string;
  mrr_estimated: number;
}

export interface MrrReportSummary {
  by_currency: MrrByCurrency[];
}
