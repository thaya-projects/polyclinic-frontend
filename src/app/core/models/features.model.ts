// Espeja FeaturesDTO del backend. `modules` es un mapa boolean por key conocida (odontogram,
// telemedicine, invoicing, whatsapp, treatment_plans). El backend siempre devuelve las 5 keys,
// con default false si el plan no las trae y el tenant no las override.
export interface FeaturesDto {
  modules: Record<string, boolean>;
}

export const FEATURE_KEYS = [
  'odontogram',
  'telemedicine',
  'invoicing',
  'whatsapp',
  'treatment_plans',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

// PATCH body: null quita el override (usa plan), true/false setea override.
export interface UpdateEnabledModulesDto {
  enabled_modules: Record<string, boolean | null>;
}

// Respuesta de GET /superadmin/tenants/:id/settings. Sólo trae las keys con override explícito.
// Ausencia = "usa el plan" (misma semántica que en PATCH).
export interface EnabledModulesResponse {
  enabled_modules: Record<string, boolean>;
}
