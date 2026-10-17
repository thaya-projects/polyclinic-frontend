import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Payment, PaymentDto } from '../models/payment.model';

// Capa HTTP pura — sin estado. PaymentsService la consume.
@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/invoices`;

  getForInvoice(invoiceId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/${invoiceId}/payments`);
  }

  create(invoiceId: string, dto: PaymentDto): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/${invoiceId}/payments`, dto);
  }
}
