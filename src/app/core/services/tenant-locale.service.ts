import { Injectable, computed, inject } from '@angular/core';
import { AuthStore } from './auth-store.service';
import { COUNTRIES } from '../constants/countries.const';

export const FALLBACK_LOCALE = 'es';

// Locale BCP 47 del tenant de la sesión, para formatear números y fechas (Intl): primero el
// `locale` del tenant (AuthTenantDTO), si no el sugerido por su país (COUNTRIES) y si no 'es'.
// Un valor que Intl no reconoce se descarta.
export function resolveTenantLocale(tenant: { locale?: string | null; country_code?: string | null } | null): string {
  const candidates = [tenant?.locale, COUNTRIES.find(c => c.value === tenant?.country_code)?.locale];
  for (const candidate of candidates) {
    if (candidate && isSupportedLocale(candidate)) return candidate;
  }
  return FALLBACK_LOCALE;
}

function isSupportedLocale(locale: string): boolean {
  try {
    return Intl.NumberFormat.supportedLocalesOf([locale]).length > 0;
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class TenantLocaleService {
  private authStore = inject(AuthStore);

  readonly locale = computed(() => resolveTenantLocale(this.authStore.tenant()));
}
