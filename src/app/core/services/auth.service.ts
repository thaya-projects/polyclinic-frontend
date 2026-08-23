import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, delay, of, switchMap, throwError } from 'rxjs';
import { AuthResponse, AuthUser, LoginRequest } from '../models/auth.model';

const KEYS = {
  ACCESS_TOKEN: 'mc_access',
  REFRESH_TOKEN: 'mc_refresh',
  EXPIRES_AT: 'mc_expires',
} as const;

// Claim URIs — mismo formato que emitiría un backend ASP.NET Identity real
const CLAIM_SUB   = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
const CLAIM_EMAIL = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const CLAIM_NAME  = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const CLAIM_ROLE  = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

interface DemoUser {
  userId: string;
  email: string;
  password: string;
  name: string;
  role: string;
  clinicId: string | null;
}

// Usuarios de demo — sin backend, credenciales fijas por rol
export const DEMO_USERS: DemoUser[] = [
  { userId: 'usr-superadmin', email: 'superadmin@medconnect.com', password: 'demo123', name: 'Ana Belén Rojas',    role: 'SuperAdmin',         clinicId: null },
  { userId: 'usr-admin',      email: 'admin@medconnect.com',      password: 'demo123', name: 'Carlos Medina',      role: 'Admin',              clinicId: 'clinic-1' },
  { userId: 'usr-1',          email: 'doctor@medconnect.com',     password: 'demo123', name: 'Dr. Roberto Vargas', role: 'Doctor',             clinicId: 'clinic-1' },
  { userId: 'usr-secretary',  email: 'secretaria@medconnect.com', password: 'demo123', name: 'Lucía Fernández',    role: 'Secretary',          clinicId: 'clinic-1' },
  { userId: 'usr-patient',    email: 'paciente@medconnect.com',   password: 'demo123', name: 'Rosa Mamani Quispe', role: 'Patient',            clinicId: null },
];

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildMockToken(user: DemoUser): string {
  const payload = {
    [CLAIM_SUB]: user.userId,
    [CLAIM_EMAIL]: user.email,
    [CLAIM_NAME]: user.name,
    [CLAIM_ROLE]: user.role,
    ClinicId: user.clinicId,
  };
  return `demo.${base64UrlEncode(JSON.stringify(payload))}.mock`;
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

function userFromToken(token: string): AuthUser | null {
  const p = decodeJwt(token);
  const userId = p[CLAIM_SUB] as string;
  if (!userId) return null;
  const name = (p[CLAIM_NAME] as string) ?? '';
  return {
    userId,
    email:    (p[CLAIM_EMAIL] as string) ?? '',
    name,
    fullName: name,
    role:     (p[CLAIM_ROLE] as string) ?? '',
    clinicId: (p['ClinicId'] as string) ?? null,
  };
}

function issueTokens(user: DemoUser): AuthResponse {
  return {
    accessToken:  buildMockToken(user),
    refreshToken: `demo-refresh-${user.userId}`,
    expiresAt:    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router     = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private _user    = signal<AuthUser | null>(this.hydrateUser());
  private _loading = signal(false);
  private _error   = signal<string | null>(null);

  readonly user            = this._user.asReadonly();
  readonly currentUser     = computed(() => this._user());
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly loading         = this._loading.asReadonly();
  readonly error           = this._error.asReadonly();

  // ── Session bootstrap (called from APP_INITIALIZER) ────────────

  loadUserFromToken(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem(KEYS.ACCESS_TOKEN);
    if (token) this._user.set(userFromToken(token));
  }

  // ── Token helpers ──────────────────────────────────────────────

  getAccessToken(): string | null {
    return isPlatformBrowser(this.platformId)
      ? localStorage.getItem(KEYS.ACCESS_TOKEN)
      : null;
  }

  getRefreshToken(): string | null {
    return isPlatformBrowser(this.platformId)
      ? localStorage.getItem(KEYS.REFRESH_TOKEN)
      : null;
  }

  // ── Public API (mock — sin backend) ─────────────────────────────

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._loading.set(true);
    this._error.set(null);

    return of(null).pipe(
      delay(500),
      switchMap(() => {
        const match = DEMO_USERS.find(
          u => u.email.toLowerCase() === credentials.email.trim().toLowerCase() && u.password === credentials.password,
        );

        if (!match) {
          this._loading.set(false);
          this._error.set('Credenciales inválidas');
          return throwError(() => ({ error: { message: 'Credenciales inválidas' } }));
        }

        const res = issueTokens(match);
        this.persist(res);
        this._user.set(userFromToken(res.accessToken));
        this._loading.set(false);
        return of(res);
      }),
    );
  }

  refresh(): Observable<AuthResponse | null> {
    const current = this._user();
    const match = current && DEMO_USERS.find(u => u.userId === current.userId);
    if (!match) {
      this.clearSession();
      return of(null);
    }

    const res = issueTokens(match);
    this.persist(res);
    this._user.set(userFromToken(res.accessToken));
    return of(res);
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── Private ────────────────────────────────────────────────────

  private persist(res: AuthResponse) {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(KEYS.ACCESS_TOKEN,  res.accessToken);
    localStorage.setItem(KEYS.REFRESH_TOKEN, res.refreshToken);
    localStorage.setItem(KEYS.EXPIRES_AT,    res.expiresAt);
  }

  private clearSession() {
    if (!isPlatformBrowser(this.platformId)) return;
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    this._user.set(null);
    this._error.set(null);
  }

  private hydrateUser(): AuthUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const token = localStorage.getItem(KEYS.ACCESS_TOKEN);
    return token ? userFromToken(token) : null;
  }
}
