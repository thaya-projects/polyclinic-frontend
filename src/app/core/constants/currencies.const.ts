import { COUNTRIES } from './countries.const';

// Mismas monedas que ya usan los tenants (ver countries.const) — evita
// inventar un catálogo de monedas aparte para el alta de servicios.
export const CURRENCIES: string[] = Array.from(new Set(COUNTRIES.map(c => c.currency)));

// Moneda de la clínica para preseleccionar en los forms (plan, factura, servicio): la
// default_currency de la sesión; sesiones guardadas antes de tiparla caen a la del país.
export function resolveTenantCurrency(
  tenant: { default_currency?: string | null; country_code?: string | null } | null,
): string {
  return (
    tenant?.default_currency ||
    COUNTRIES.find(c => c.value === tenant?.country_code?.toUpperCase())?.currency ||
    CURRENCIES[0]
  );
}

// La moneda de la clínica primero; si no está en el catálogo, se agrega igual.
export function currencyOptions(tenantCurrency: string): string[] {
  return [tenantCurrency, ...CURRENCIES.filter(c => c !== tenantCurrency)];
}
