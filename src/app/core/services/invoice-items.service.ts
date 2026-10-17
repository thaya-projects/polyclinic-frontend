import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, switchMap, tap } from 'rxjs';
import { InvoiceItemsApi } from './invoice-items-api';
import { InvoicesService } from './invoices.service';
import { InvoiceItem, InvoiceItemDto } from '../models/invoice-item.model';
import { invoiceItemsListErrorMessage } from '../../shared/utils/invoice-items-error.util';

// Clase separada de InvoicesService, igual que en el backend
// (InvoiceItemService/Repository son clases propias). Depende de
// InvoicesService a propósito: cada mutación de un item recalcula
// subtotal/total del lado del backend, así que volvemos a pedir el
// detalle de la factura después de cada una (criterio de aceptación de
// T5 — el total mostrado siempre es el del backend).
@Injectable({ providedIn: 'root' })
export class InvoiceItemsService {
  private api = inject(InvoiceItemsApi);
  private invoicesSvc = inject(InvoicesService);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<InvoiceItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/invoices/:id/items
  loadForInvoice(invoiceId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getForInvoice(invoiceId).subscribe({
      next: items => {
        this.records.set(items);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(invoiceItemsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/invoices/:id/items
  create(invoiceId: string, dto: InvoiceItemDto): Observable<InvoiceItem> {
    return this.api.create(invoiceId, dto).pipe(
      tap(item => this.records.update(list => [...list, item])),
      switchMap(item => this.invoicesSvc.loadDetail(invoiceId).pipe(map(() => item))),
    );
  }

  // PATCH /tenants/invoices/:id/items/:itemId — expuesto por completitud
  // del contrato; todavía no hay un form de "editar item" en la UI.
  update(invoiceId: string, itemId: string, dto: Partial<InvoiceItemDto>): Observable<InvoiceItem> {
    return this.api.update(invoiceId, itemId, dto).pipe(
      tap(item => this.upsertLocal(item)),
      switchMap(item => this.invoicesSvc.loadDetail(invoiceId).pipe(map(() => item))),
    );
  }

  // DELETE /tenants/invoices/:id/items/:itemId
  remove(invoiceId: string, itemId: string): Observable<void> {
    return this.api.remove(invoiceId, itemId).pipe(
      tap(() => this.records.update(list => list.filter(i => i.id !== itemId))),
      switchMap(() => this.invoicesSvc.loadDetail(invoiceId).pipe(map(() => undefined))),
    );
  }

  private upsertLocal(item: InvoiceItem): void {
    this.records.update(list => {
      const exists = list.some(i => i.id === item.id);
      return exists ? list.map(i => (i.id === item.id ? item : i)) : [...list, item];
    });
  }
}
