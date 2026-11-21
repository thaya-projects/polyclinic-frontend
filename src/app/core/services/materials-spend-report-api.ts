import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MaterialsSpendReport, MaterialsSpendReportQuery } from '../models/financial-report.model';

// Capa HTTP pura — sin estado. MaterialsSpendReportService la consume.
// GET /tenants/reports/materials?from=&to=
@Injectable({ providedIn: 'root' })
export class MaterialsSpendReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/materials`;

  getSummary(query: MaterialsSpendReportQuery): Observable<MaterialsSpendReport> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);
    return this.http.get<MaterialsSpendReport>(this.base, { params });
  }
}
