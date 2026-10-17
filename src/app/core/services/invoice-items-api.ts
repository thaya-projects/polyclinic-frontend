import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvoiceItem, InvoiceItemDto } from '../models/invoice-item.model';

// Capa HTTP pura — sin estado. InvoiceItemsService la consume.
@Injectable({ providedIn: 'root' })
export class InvoiceItemsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/invoices`;

  getForInvoice(invoiceId: string): Observable<InvoiceItem[]> {
    return this.http.get<InvoiceItem[]>(`${this.base}/${invoiceId}/items`);
  }

  create(invoiceId: string, dto: InvoiceItemDto): Observable<InvoiceItem> {
    return this.http.post<InvoiceItem>(`${this.base}/${invoiceId}/items`, dto);
  }

  update(invoiceId: string, itemId: string, dto: Partial<InvoiceItemDto>): Observable<InvoiceItem> {
    return this.http.patch<InvoiceItem>(`${this.base}/${invoiceId}/items/${itemId}`, dto);
  }

  remove(invoiceId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${invoiceId}/items/${itemId}`);
  }
}
