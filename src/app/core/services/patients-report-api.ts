import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientsReport, PatientsReportQuery } from '../models/clinic-report.model';

// GET /tenants/reports/patients?from=&to=&is_active= — sin PII (sin
// nombres/documentos ni lista de pacientes, solo conteos).
@Injectable({ providedIn: 'root' })
export class PatientsReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/patients`;

  getSummary(query: PatientsReportQuery): Observable<PatientsReport> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.is_active !== undefined) params = params.set('is_active', String(query.is_active));
    return this.http.get<PatientsReport>(this.base, { params });
  }
}
