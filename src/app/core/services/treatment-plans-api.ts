import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TreatmentPlan, TreatmentPlanDto, TreatmentPlanStatusChangeDto } from '../models/treatment-plan.model';

// Capa HTTP pura — sin estado. TreatmentPlansService la consume.
@Injectable({ providedIn: 'root' })
export class TreatmentPlansApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants`;

  getForPatient(patientId: string): Observable<TreatmentPlan[]> {
    return this.http.get<TreatmentPlan[]>(`${this.base}/patients/${patientId}/treatment-plans`);
  }

  create(patientId: string, dto: TreatmentPlanDto): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(`${this.base}/patients/${patientId}/treatment-plans`, dto);
  }

  getById(id: string): Observable<TreatmentPlan> {
    return this.http.get<TreatmentPlan>(`${this.base}/treatment-plans/${id}`);
  }

  update(id: string, dto: TreatmentPlanDto): Observable<TreatmentPlan> {
    return this.http.patch<TreatmentPlan>(`${this.base}/treatment-plans/${id}`, dto);
  }

  // POST /tenants/treatment-plans/:id/status — body { status, note }.
  changeStatus(id: string, dto: TreatmentPlanStatusChangeDto): Observable<TreatmentPlan> {
    return this.http.post<TreatmentPlan>(`${this.base}/treatment-plans/${id}/status`, dto);
  }
}
