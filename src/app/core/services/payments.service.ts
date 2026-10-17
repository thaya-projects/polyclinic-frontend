import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, switchMap, tap } from 'rxjs';
import { PaymentsApi } from './payments-api';
import { InvoicesService } from './invoices.service';
import { Payment, PaymentDto } from '../models/payment.model';
import { paymentsListErrorMessage } from '../../shared/utils/payments-error.util';

// Depende de InvoicesService a propósito: registrar un pago puede
// recalcular el status de la factura (parcial/pagada) del lado del
// backend, así que volvemos a pedir su detalle después de cada pago
// (criterio de aceptación de T5).
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private api = inject(PaymentsApi);
  private invoicesSvc = inject(InvoicesService);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Payment[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/invoices/:id/payments
  loadForInvoice(invoiceId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getForInvoice(invoiceId).subscribe({
      next: payments => {
        this.records.set(payments);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(paymentsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/invoices/:id/payments — nunca manda tenant_id. El
  // monto ya lo validó el form contra el saldo visible; el backend
  // vuelve a validar (409 si de todos modos se pasa).
  create(invoiceId: string, dto: PaymentDto): Observable<Payment> {
    return this.api.create(invoiceId, dto).pipe(
      tap(payment => this.records.update(list => [...list, payment])),
      switchMap(payment => this.invoicesSvc.loadDetail(invoiceId).pipe(map(() => payment))),
    );
  }
}
