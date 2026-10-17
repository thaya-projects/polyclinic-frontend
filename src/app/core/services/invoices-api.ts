import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invoice, InvoiceDto, InvoicesQuery } from '../models/invoice.model';

// Capa HTTP pura — sin estado. InvoicesService la consume.
@Injectable({ providedIn: 'root' })
export class InvoicesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/invoices`;

  getAll(query: InvoicesQuery): Observable<Invoice[]> {
    let params = new HttpParams();
    if (query.patient_id) params = params.set('patient_id', query.patient_id);
    if (query.status) params = params.set('status', query.status);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<Invoice[]>(this.base, { params });
  }

  create(dto: InvoiceDto): Observable<Invoice> {
    return this.http.post<Invoice>(this.base, dto);
  }

  getById(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.base}/${id}`);
  }

  update(id: string, dto: InvoiceDto): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.base}/${id}`, dto);
  }

  issue(id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base}/${id}/issue`, {});
  }

  void(id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base}/${id}/void`, {});
  }
}
