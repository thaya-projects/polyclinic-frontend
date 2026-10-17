import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { InvoicesFilters } from '../invoices-filters/invoices-filters';
import { InvoicesTable, InvoiceRow } from '../invoices-table/invoices-table';
import { InvoiceForm, InvoiceSubmitPayload } from '../invoice-form/invoice-form';
import { InvoiceItemForm } from '../invoice-item-form/invoice-item-form';
import { InvoiceItemsPreview, InvoiceItemDraft } from '../invoice-items-preview/invoice-items-preview';
import { PaymentForm } from '../payment-form/payment-form';
import { PaymentsList } from '../payments-list/payments-list';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { InvoicesService } from '../../../core/services/invoices.service';
import { InvoiceItemsService } from '../../../core/services/invoice-items.service';
import { InvoiceOptionsService } from '../../../core/services/invoice-options.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { Invoice, InvoicesQuery, InvoiceStatus } from '../../../core/models/invoice.model';
import { InvoiceItemDto } from '../../../core/models/invoice-item.model';
import { PaymentDto } from '../../../core/models/payment.model';
import { canVoid } from '../../../core/constants/invoice-status.const';
import { invoiceDetailErrorMessage, invoiceIssueErrorMessage, invoiceSaveErrorMessage, invoiceVoidErrorMessage } from '../../../shared/utils/invoices-error.util';
import { invoiceItemSaveErrorMessage } from '../../../shared/utils/invoice-items-error.util';
import { paymentSaveErrorMessage } from '../../../shared/utils/payments-error.util';
import { PageTitleService } from '../../../core/services/page-title.service';

const PAYABLE_STATUSES: InvoiceStatus[] = ['emitida', 'parcial'];

@Component({
  selector: 'app-invoices-page',
  imports: [
    InvoicesFilters,
    InvoicesTable,
    InvoiceForm,
    InvoiceItemForm,
    InvoiceItemsPreview,
    PaymentForm,
    PaymentsList,
    Modal,
    ConfirmDialog,
  ],
  templateUrl: './invoices-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesPage {
  private invoicesSvc = inject(InvoicesService);
  private itemsSvc = inject(InvoiceItemsService);
  private optionsSvc = inject(InvoiceOptionsService);
  private paymentsSvc = inject(PaymentsService);

  private allInvoices = this.invoicesSvc.getAll();
  private allItems = this.itemsSvc.getAll();
  private allPayments = this.paymentsSvc.getAll();
  private patients = this.optionsSvc.patients();
  private branches = this.optionsSvc.branches();

  search = signal('');
  filters = signal<Record<string, string>>({});
  dateFrom = signal('');
  dateTo = signal('');

  readonly listLoading = this.invoicesSvc.loading;
  readonly listError = this.invoicesSvc.error;

  creating = signal(false);
  saving = signal(false);
  actionError = signal<string | null>(null);

  selectedInvoiceId = signal<string | null>(null);
  editing = signal(false);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  readonly itemsLoading = this.itemsSvc.loading;
  readonly itemsError = this.itemsSvc.error;
  itemActionError = signal<string | null>(null);

  readonly paymentsLoading = this.paymentsSvc.loading;
  readonly paymentsError = this.paymentsSvc.error;
  paymentActionError = signal<string | null>(null);

  confirmingIssue = signal(false);
  confirmingVoid = signal(false);

  readonly canVoid = canVoid;

  // Criterio de aceptación T4: el form de pago solo aparece si la factura
  // está emitida o parcial.
  readonly canRegisterPayment = (status: InvoiceStatus) => PAYABLE_STATUSES.includes(status);

  // Join local con el mock de pacientes/sucursales — solo para mostrar el
  // nombre; invoice.patient_id/branch_id siguen siendo la fuente de verdad.
  private readonly rows = computed<InvoiceRow[]>(() =>
    this.allInvoices().map(invoice => {
      const patient = this.patients().find(p => p.id === invoice.patient_id);
      return { ...invoice, patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente desconocido' };
    }),
  );

  // patient_id/status/from/to ya los filtra el backend (GET /tenants/
  // invoices?...); el buscador de N° de factura sigue siendo client-side
  // porque ese endpoint no expone un filtro de texto libre.
  readonly filteredInvoices = computed(() => {
    const term = this.search().toLowerCase().trim();
    return this.rows().filter(row => !term || row.invoice_number?.toLowerCase().includes(term));
  });

  readonly selectedInvoice = computed<Invoice | null>(() => {
    const id = this.selectedInvoiceId();
    return id ? (this.allInvoices().find(i => i.id === id) ?? null) : null;
  });

  // Items de la factura abierta en el detalle, en el shape que espera
  // InvoiceItemsPreview (desacoplada: no sabe que estos vienen de un
  // InvoiceItem real conectado a HTTP).
  readonly selectedInvoiceItems = computed<InvoiceItemDraft[]>(() =>
    this.allItems().map(item => ({
      tempId: item.id,
      dto: {
        service_id: item.service_id,
        treatment_plan_item_id: item.treatment_plan_item_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      },
    })),
  );

  readonly selectedInvoicePayments = computed(() => this.allPayments());

  // Saldo pendiente = total - sum(pagos). total siempre es el que
  // devolvió el backend (nunca un cálculo local) — PaymentsService ya
  // refresca el detalle de la factura después de cada pago.
  readonly selectedInvoiceBalance = computed(() => {
    const invoice = this.selectedInvoice();
    if (!invoice) return 0;
    const paid = this.selectedInvoicePayments().reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, invoice.total - paid);
  });

  constructor() {
    inject(PageTitleService).set('Facturas');

    effect(() => {
      this.invoicesSvc.load(this.currentQuery());
    });
  }

  private currentQuery(): InvoicesQuery {
    return {
      patient_id: this.filters()['patient_id'] || undefined,
      status: (this.filters()['status'] as InvoiceStatus) || undefined,
      from: this.dateFrom() || undefined,
      to: this.dateTo() || undefined,
    };
  }

  openCreate(): void {
    this.actionError.set(null);
    this.creating.set(true);
  }

  closeCreate(): void {
    this.creating.set(false);
  }

  // POST /tenants/invoices — persiste y aparece en el listado sin
  // recargar la página. Cada item se crea con un POST real (create() de
  // InvoiceItemsService ya refresca subtotal/total después de cada uno).
  onCreate(payload: InvoiceSubmitPayload): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.invoicesSvc.create(payload.invoice).subscribe({
      next: invoice => {
        const itemRequests = payload.items.map(dto => this.itemsSvc.create(invoice.id, dto));
        (itemRequests.length ? forkJoin(itemRequests) : of([])).subscribe({
          next: () => {
            this.saving.set(false);
            this.creating.set(false);
          },
          error: err => {
            // La factura ya quedó creada (y visible en el listado) aunque
            // algún item haya fallado — el error se muestra igual.
            this.saving.set(false);
            this.actionError.set(invoiceItemSaveErrorMessage(err));
          },
        });
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(invoiceSaveErrorMessage(err));
      },
    });
  }

  openDetail(invoice: Invoice): void {
    this.selectedInvoiceId.set(invoice.id);
    this.editing.set(false);
    this.actionError.set(null);
    this.itemActionError.set(null);
    this.paymentActionError.set(null);
    this.detailError.set(null);
    this.detailLoading.set(true);

    // GET /tenants/invoices/:id — refresca con lo último del backend;
    // mientras tanto ya se ve la copia cacheada del listado.
    this.invoicesSvc.loadDetail(invoice.id).subscribe({
      next: () => this.detailLoading.set(false),
      error: err => {
        this.detailLoading.set(false);
        this.detailError.set(invoiceDetailErrorMessage(err));
      },
    });
    this.itemsSvc.loadForInvoice(invoice.id);
    this.paymentsSvc.loadForInvoice(invoice.id);
  }

  closeDetail(): void {
    this.selectedInvoiceId.set(null);
    this.editing.set(false);
    this.actionError.set(null);
    this.confirmingIssue.set(false);
    this.confirmingVoid.set(false);
  }

  // T3 — emitir requiere confirmación explícita y al menos un item
  // (criterio de aceptación; el botón ya está oculto si no se cumple,
  // esto es una segunda barrera por si igual se llega a llamar).
  requestIssue(): void {
    if (this.selectedInvoiceItems().length === 0) return;
    this.confirmingIssue.set(true);
  }

  cancelIssue(): void {
    this.confirmingIssue.set(false);
  }

  // POST /tenants/invoices/:id/issue — issue() ya vuelve a pedir el
  // detalle tras el POST, así que invoice_number/status quedan como los
  // dejó el backend.
  confirmIssue(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.invoicesSvc.issue(invoice.id).subscribe({
      next: () => this.confirmingIssue.set(false),
      error: err => {
        this.confirmingIssue.set(false);
        this.actionError.set(invoiceIssueErrorMessage(err));
      },
    });
  }

  // T3 — anular no borra la fila (regla del schema), solo cambia el
  // status; es irreversible desde esta UI, por eso la advertencia previa.
  requestVoid(): void {
    this.confirmingVoid.set(true);
  }

  cancelVoid(): void {
    this.confirmingVoid.set(false);
  }

  confirmVoid(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.invoicesSvc.void(invoice.id).subscribe({
      next: () => this.confirmingVoid.set(false),
      error: err => {
        this.confirmingVoid.set(false);
        this.actionError.set(invoiceVoidErrorMessage(err));
      },
    });
  }

  openEdit(): void {
    this.actionError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.actionError.set(null);
    this.editing.set(false);
  }

  // PATCH /tenants/invoices/:id — solo notes/branch/tax/currency; 409 si
  // la factura ya no es borrador (los items se manejan con sus propias
  // acciones, no acá).
  onSaveEdit(payload: InvoiceSubmitPayload): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.invoicesSvc.update(invoice.id, payload.invoice).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(invoiceSaveErrorMessage(err));
      },
    });
  }

  // POST /tenants/invoices/:id/items — create() ya refresca subtotal/
  // total de la factura tras guardar.
  onItemAdded(dto: InvoiceItemDto): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.itemActionError.set(null);
    this.itemsSvc.create(invoice.id, dto).subscribe({
      error: err => this.itemActionError.set(invoiceItemSaveErrorMessage(err)),
    });
  }

  // DELETE /tenants/invoices/:id/items/:itemId — remove() ya refresca
  // subtotal/total de la factura tras guardar.
  onItemRemoved(itemId: string): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.itemActionError.set(null);
    this.itemsSvc.remove(invoice.id, itemId).subscribe({
      error: err => this.itemActionError.set(invoiceItemSaveErrorMessage(err)),
    });
  }

  // POST /tenants/invoices/:id/payments — PaymentForm ya validó en
  // cliente que amount > 0 y no supere el saldo visible; create() refresca
  // el detalle de la factura, así que status (parcial/pagada) y saldo
  // quedan como los calculó el backend.
  onPaymentAdded(dto: PaymentDto): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    this.paymentActionError.set(null);
    this.paymentsSvc.create(invoice.id, dto).subscribe({
      error: err => this.paymentActionError.set(paymentSaveErrorMessage(err)),
    });
  }

  patientName(patientId: string): string {
    const patient = this.patients().find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Paciente desconocido';
  }

  branchName(branchId: string | null): string {
    if (!branchId) return '—';
    return this.branches().find(b => b.id === branchId)?.name ?? '—';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
