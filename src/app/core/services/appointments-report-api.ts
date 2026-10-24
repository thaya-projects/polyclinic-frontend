import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppointmentsByStatusSummary, AppointmentsReportQuery } from '../models/clinic-report.model';

// Capa HTTP pura — sin estado. AppointmentsReportService la consume.
// GET /tenants/reports/appointments?from=&to=&professional_id=&status=
@Injectable({ providedIn: 'root' })
export class AppointmentsReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/appointments`;

  getSummary(query: AppointmentsReportQuery): Observable<AppointmentsByStatusSummary[]> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.professional_id) params = params.set('professional_id', query.professional_id);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<AppointmentsByStatusSummary[]>(this.base, { params });
  }
}
