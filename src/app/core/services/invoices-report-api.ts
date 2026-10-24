import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvoicesReportQuery, InvoicesSummaryByCurrency } from '../models/clinic-report.model';

// GET /tenants/reports/invoices?from=&to=&status= — asumo que responde
// directo el array por moneda (el schema no detalla el shape exacto).
@Injectable({ providedIn: 'root' })
export class InvoicesReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/invoices`;

  getSummary(query: InvoicesReportQuery): Observable<InvoicesSummaryByCurrency[]> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<InvoicesSummaryByCurrency[]>(this.base, { params });
  }
}
