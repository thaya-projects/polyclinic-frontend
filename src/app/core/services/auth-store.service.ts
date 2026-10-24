import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthTokenResponse, MeResponseDto, SessionTenant, SessionUser } from '../models/auth.model';
import { TenantStatus } from '../models/tenant.model';
import { decodeJwtPayload } from '../../shared/utils/jwt.util';
import { AuthTokenService } from './auth-token.service';

const SESSION_KEY = 'mc_session';

interface StoredSession {
  user: SessionUser | null;
  tenant: SessionTenant | null;
  subscriptionStatus: TenantStatus | null;
}

// Estado global de sesión (usuario + tenant + estado de suscripción
// logueados). Se persiste en localStorage solo para sobrevivir a un
// refresh de página — la fuente de verdad de si hay sesión activa siguen
// siendo los tokens (AuthTokenService).
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private platformId = inject(PLATFORM_ID);
  private tokens = inject(AuthTokenService);
  private restored = this.restore();

  private readonly userSignal = signal<SessionUser | null>(this.restored?.user ?? null);
  private readonly tenantSignal = signal<SessionTenant | null>(this.restored?.tenant ?? null);
  private readonly subscriptionStatusSignal = signal<TenantStatus | null>(
    this.restored?.subscriptionStatus ?? null,
  );

  private readonly impersonatedBySignal = signal<string | null>(this.readImpersonatedBy());

  // No se persiste — es solo un flag de UI mientras authGuard/el initializer
  // están esperando un GET /auth/me (T17).
  private readonly verifyingSignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly tenant = this.tenantSignal.asReadonly();
  // Guardado para uso futuro (T16) — todavía no se consume en ninguna UI.
  readonly subscriptionStatus = this.subscriptionStatusSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly verifying = this.verifyingSignal.asReadonly();
  readonly impersonatedBy = this.impersonatedBySignal.asReadonly();

  setVerifying(value: boolean): void {
    this.verifyingSignal.set(value);
  }

  // Login/refresh (T15): estos no traen subscription_status.
  setSession(res: AuthTokenResponse): void {
    this.userSignal.set(res.user ?? null);
    this.tenantSignal.set(res.tenant ?? null);
    this.impersonatedBySignal.set(this.readImpersonatedBy());
    this.persist();
  }

  // GET /auth/me (T16): hidrata con el estado fresco del usuario, incluido subscription_status.
  setFromMe(res: MeResponseDto): void {
    this.userSignal.set(res.user);
    this.tenantSignal.set(res.tenant ?? null);
    this.subscriptionStatusSignal.set(res.subscription_status ?? null);
    this.impersonatedBySignal.set(this.readImpersonatedBy());
    this.persist();
  }

  clearSession(): void {
    this.userSignal.set(null);
    this.tenantSignal.set(null);
    this.subscriptionStatusSignal.set(null);
    this.impersonatedBySignal.set(null);
    if (isPlatformBrowser(this.platformId)) localStorage.removeItem(SESSION_KEY);
  }

  private readImpersonatedBy(): string | null {
    const token = this.tokens.getAccessToken();
    if (!token) return null;
    const payload = decodeJwtPayload<{ impersonated_by?: string | null }>(token);
    return payload?.impersonated_by ?? null;
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const data: StoredSession = {
      user: this.userSignal(),
      tenant: this.tenantSignal(),
      subscriptionStatus: this.subscriptionStatusSignal(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  private restore(): StoredSession | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
