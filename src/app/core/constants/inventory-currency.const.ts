// Material/Stock/Expense solo aceptan la moneda del tenant o USD (regla propia de inventarios,
// más acotada que currencies.const.ts, que lista todo el catálogo de países).
export function inventoryCurrencyOptions(tenantCurrency: string): string[] {
  return tenantCurrency === 'USD' ? ['USD'] : [tenantCurrency, 'USD'];
}
