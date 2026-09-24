import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePlanDto, Plan, PlanListFilter, UpdatePlanDto } from '../models/plan.model';
import { PagedResult } from '../models/paged-result.model';

// Capa HTTP pura — sin estado, sin caché. El servicio con signals llega con
// T6 (UI listado y form de planes). Mismo patrón que TenantsApi.
@Injectable({ providedIn: 'root' })
export class PlansApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/superadmin/plans`;

  list(filter: PlanListFilter = {}): Observable<PagedResult<Plan>> {
    let params = new HttpParams();
    if (filter.q) params = params.set('q', filter.q);
    if (filter.is_active !== undefined) params = params.set('is_active', String(filter.is_active));
    if (filter.page !== undefined) params = params.set('page', String(filter.page));
    if (filter.limit !== undefined) params = params.set('limit', String(filter.limit));

    return this.http.get<PagedResult<Plan>>(this.base, { params });
  }

  getById(id: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.base}/${id}`);
  }

  create(dto: CreatePlanDto): Observable<Plan> {
    return this.http.post<Plan>(this.base, dto);
  }

  update(id: string, dto: UpdatePlanDto): Observable<Plan> {
    return this.http.patch<Plan>(`${this.base}/${id}`, dto);
  }
}
