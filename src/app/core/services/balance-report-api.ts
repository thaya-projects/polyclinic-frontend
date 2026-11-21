import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BalanceReport, BalanceReportQuery } from '../models/financial-report.model';

// Capa HTTP pura — sin estado. BalanceReportService la consume.
// GET /tenants/reports/balance?from=&to=
@Injectable({ providedIn: 'root' })
export class BalanceReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/balance`;

  getSummary(query: BalanceReportQuery): Observable<BalanceReport> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);
    return this.http.get<BalanceReport>(this.base, { params });
  }
}
