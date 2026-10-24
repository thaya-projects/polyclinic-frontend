import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantsReportSummary } from '../models/platform-report.model';

// GET /superadmin/reports/tenants — sin filtros (snapshot del estado actual).
@Injectable({ providedIn: 'root' })
export class TenantsReportApi {
  private http = inject(HttpClient);

  getSummary(): Observable<TenantsReportSummary> {
    return this.http.get<TenantsReportSummary>(`${environment.apiUrl}/superadmin/reports/tenants`);
  }
}
