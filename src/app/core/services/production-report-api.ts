import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProductionReport, ProductionReportQuery } from '../models/financial-report.model';

// Capa HTTP pura — sin estado. ProductionReportService la consume.
// GET /tenants/reports/production?from=&to=&professional_id=
@Injectable({ providedIn: 'root' })
export class ProductionReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/production`;

  getSummary(query: ProductionReportQuery): Observable<ProductionReport> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.professional_id) params = params.set('professional_id', query.professional_id);
    return this.http.get<ProductionReport>(this.base, { params });
  }
}
