import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EncountersReport, EncountersReportQuery } from '../models/clinic-report.model';

// GET /tenants/reports/encounters?from=&to=&professional_id= — siempre cuenta
// solo notas firmadas (signed), sin PII (sin patient_id, sin contenido clínico).
@Injectable({ providedIn: 'root' })
export class EncountersReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/encounters`;

  getSummary(query: EncountersReportQuery): Observable<EncountersReport> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.professional_id) params = params.set('professional_id', query.professional_id);
    return this.http.get<EncountersReport>(this.base, { params });
  }
}
