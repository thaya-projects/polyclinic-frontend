import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CancelSubscriptionDto,
  ChangePlanDto,
  CheckoutSessionDto,
  ExtendTrialDto,
  Subscription,
} from '../models/subscription.model';

// Capa HTTP pura para /superadmin/tenants/:id/subscription y /tenants/me/subscription.
@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getByTenant(tenantId: string): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.base}/superadmin/tenants/${tenantId}/subscription`);
  }

  changePlan(tenantId: string, dto: ChangePlanDto): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.base}/superadmin/tenants/${tenantId}/subscription`, dto);
  }

  cancel(tenantId: string, dto: CancelSubscriptionDto = {}): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.base}/superadmin/tenants/${tenantId}/subscription/cancel`, dto);
  }

  extendTrial(tenantId: string, dto: ExtendTrialDto): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${this.base}/superadmin/tenants/${tenantId}/subscription/extend-trial`, dto);
  }

  createCheckout(tenantId: string): Observable<CheckoutSessionDto> {
    return this.http.post<CheckoutSessionDto>(
      `${this.base}/superadmin/tenants/${tenantId}/subscription/checkout`, {});
  }

  getMine(): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.base}/tenants/me/subscription`);
  }
}
