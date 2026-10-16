import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { SubscriptionsApi } from './subscriptions-api';
import { Subscription } from '../models/subscription.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Wrapper con signals para las vistas de admin/tenant. Cada tenantId (para admin) o el user
// logueado (para /me) carga en sus propios signals; se guardan por id para no perder el estado
// al navegar entre tenants distintos.
@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private api = inject(SubscriptionsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly byTenant = signal<Record<string, Subscription | null>>({});
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly mineSignal = signal<Subscription | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly mine = this.mineSignal.asReadonly();

  get(tenantId: string): Subscription | null {
    return this.byTenant()[tenantId] ?? null;
  }

  loadByTenant(tenantId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getByTenant(tenantId).subscribe({
      next: sub => {
        this.byTenant.update(map => ({ ...map, [tenantId]: sub }));
        this.loadingSignal.set(false);
      },
      error: err => {
        // 404: el tenant no tiene subscription — no es error de red, marcamos null para que la
        // vista sepa mostrar "sin suscripción" en lugar de un banner rojo.
        if ((err?.status ?? 0) === 404) {
          this.byTenant.update(map => ({ ...map, [tenantId]: null }));
          this.loadingSignal.set(false);
          return;
        }
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  loadMine(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getMine().subscribe({
      next: sub => {
        this.mineSignal.set(sub);
        this.loadingSignal.set(false);
      },
      error: err => {
        if ((err?.status ?? 0) === 404) {
          this.mineSignal.set(null);
          this.loadingSignal.set(false);
          return;
        }
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  changePlan(tenantId: string, planId: string): Observable<Subscription> {
    return this.api.changePlan(tenantId, { plan_id: planId }).pipe(
      tap(sub => this.byTenant.update(map => ({ ...map, [tenantId]: sub }))));
  }

  cancel(tenantId: string, atPeriodEnd = false): Observable<Subscription> {
    return this.api.cancel(tenantId, { at_period_end: atPeriodEnd }).pipe(
      tap(sub => this.byTenant.update(map => ({ ...map, [tenantId]: sub }))));
  }

  extendTrial(tenantId: string, days: number): Observable<Subscription> {
    return this.api.extendTrial(tenantId, { days }).pipe(
      tap(sub => this.byTenant.update(map => ({ ...map, [tenantId]: sub }))));
  }

  createCheckout(tenantId: string) {
    return this.api.createCheckout(tenantId);
  }
}
