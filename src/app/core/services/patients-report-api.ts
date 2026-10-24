import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientsReportQuery } from '../models/clinic-report.model';

// GET /tenants/reports/patients?from=&to= — asumo que responde
// { new_patients_count: number } (el schema no detalla el shape exacto).
export interface PatientsReportResponse {
  new_patients_count: number;
}

@Injectable({ providedIn: 'root' })
export class PatientsReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/patients`;

  getSummary(query: PatientsReportQuery): Observable<PatientsReportResponse> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);
    return this.http.get<PatientsReportResponse>(this.base, { params });
  }
}
