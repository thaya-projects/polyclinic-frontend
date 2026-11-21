import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvoicesReport, InvoicesReportQuery } from '../models/clinic-report.model';

// GET /tenants/reports/invoices?from=&to=&status= — distinto de /reports/balance
// (ese es el neto plata-entra-menos-plata-sale; este es específicamente sobre facturas).
@Injectable({ providedIn: 'root' })
export class InvoicesReportApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reports/invoices`;

  getSummary(query: InvoicesReportQuery): Observable<InvoicesReport> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<InvoicesReport>(this.base, { params });
  }
}
