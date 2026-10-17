import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TreatmentPlanItem,
  TreatmentPlanItemDto,
  TreatmentPlanItemStatusChangeDto,
} from '../models/treatment-plan-item.model';

// Capa HTTP pura — sin estado. TreatmentPlanItemsService la consume.
@Injectable({ providedIn: 'root' })
export class TreatmentPlanItemsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/treatment-plans`;

  getForPlan(planId: string): Observable<TreatmentPlanItem[]> {
    return this.http.get<TreatmentPlanItem[]>(`${this.base}/${planId}/items`);
  }

  create(planId: string, dto: TreatmentPlanItemDto): Observable<TreatmentPlanItem> {
    return this.http.post<TreatmentPlanItem>(`${this.base}/${planId}/items`, dto);
  }

  update(planId: string, itemId: string, dto: Partial<TreatmentPlanItemDto>): Observable<TreatmentPlanItem> {
    return this.http.patch<TreatmentPlanItem>(`${this.base}/${planId}/items/${itemId}`, dto);
  }

  remove(planId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${planId}/items/${itemId}`);
  }

  // POST .../items/:itemId/status — body { status, appointment_id }. Nunca
  // se manda done_by (lo estampa el backend).
  changeStatus(planId: string, itemId: string, dto: TreatmentPlanItemStatusChangeDto): Observable<TreatmentPlanItem> {
    return this.http.post<TreatmentPlanItem>(`${this.base}/${planId}/items/${itemId}/status`, dto);
  }
}
