import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, switchMap, tap } from 'rxjs';
import { InvoicesApi } from './invoices-api';
import { Invoice, InvoiceDto, InvoicesQuery } from '../models/invoice.model';
import { invoicesListErrorMessage } from '../../shared/utils/invoices-error.util';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private api = inject(InvoicesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Invoice[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): Invoice | null {
    return this.records().find(i => i.id === id) ?? null;
  }

  // GET /tenants/invoices?patient_id=&status=&from=&to= — no corre en
  // SSR: depende del token del navegador. Reemplaza el cache completo.
  load(query: InvoicesQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: invoices => {
        this.records.set(invoices);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(invoicesListErrorMessage(err));
      },
    });
  }

  // POST /tenants/invoices — nunca manda subtotal/total/invoice_number/
  // status/tenant_id (los calcula/asigna el backend).
  create(dto: InvoiceDto): Observable<Invoice> {
    return this.api.create(dto).pipe(tap(invoice => this.records.update(list => [invoice, ...list])));
  }

  // GET /tenants/invoices/:id — refresca con lo último del backend (ej.
  // al abrir el detalle, o después de mutar items/pagos).
  loadDetail(id: string): Observable<Invoice> {
    return this.api.getById(id).pipe(tap(invoice => this.upsertLocal(invoice)));
  }

  // PATCH /tenants/invoices/:id
  update(id: string, dto: InvoiceDto): Observable<Invoice> {
    return this.api.update(id, dto).pipe(tap(invoice => this.upsertLocal(invoice)));
  }

  // POST /tenants/invoices/:id/issue — vuelve a pedir el detalle tras el
  // POST (en vez de confiar en su shape) para que invoice_number/status
  // queden exactamente como los dejó el backend.
  issue(id: string): Observable<Invoice> {
    return this.api.issue(id).pipe(
      switchMap(() => this.api.getById(id)),
      tap(invoice => this.upsertLocal(invoice)),
    );
  }

  // POST /tenants/invoices/:id/void — mismo criterio que issue().
  void(id: string): Observable<Invoice> {
    return this.api.void(id).pipe(
      switchMap(() => this.api.getById(id)),
      tap(invoice => this.upsertLocal(invoice)),
    );
  }

  private upsertLocal(invoice: Invoice): void {
    this.records.update(list => {
      const exists = list.some(i => i.id === invoice.id);
      return exists ? list.map(i => (i.id === invoice.id ? invoice : i)) : [invoice, ...list];
    });
  }
}
