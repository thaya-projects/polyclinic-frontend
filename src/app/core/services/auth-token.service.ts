import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthTokenResponse } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'mc_access_token';
const REFRESH_TOKEN_KEY = 'mc_refresh_token';

// Guarda/lee los tokens de sesión. Único punto de verdad para el
// interceptor (adjunta el header) y para cualquier login (clínica en T14,
// super admin acá en T19) — así no se duplica la lógica de storage.
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private platformId = inject(PLATFORM_ID);

  save(tokens: AuthTokenResponse): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
  }

  getAccessToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  }

  getRefreshToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  }

  clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
