import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpensesReport, ExpensesReportQuery } from '../models/financial-report.model';

// Capa HTTP pura — sin estado. ExpensesReportService la consume.
// GET /tenants/reports/expenses?from=&to=
@Injectable({ providedIn: 'root' })
export class ExpensesReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/expenses`;

  getSummary(query: ExpensesReportQuery): Observable<ExpensesReport> {
    const params = new HttpParams().set('from', query.from).set('to', query.to);
    return this.http.get<ExpensesReport>(this.base, { params });
  }
}
