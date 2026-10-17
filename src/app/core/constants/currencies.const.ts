import { COUNTRIES } from './countries.const';

// Mismas monedas que ya usan los tenants (ver countries.const) — evita
// inventar un catálogo de monedas aparte para el alta de servicios.
export const CURRENCIES: string[] = Array.from(new Set(COUNTRIES.map(c => c.currency)));
