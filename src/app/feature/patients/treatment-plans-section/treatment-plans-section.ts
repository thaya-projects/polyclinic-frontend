import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { TreatmentPlansTable } from '../treatment-plans-table/treatment-plans-table';
import { TreatmentPlanStatusBadge } from '../treatment-plan-status-badge/treatment-plan-status-badge';
import { TreatmentPlanForm, TreatmentPlanSubmitPayload } from '../treatment-plan-form/treatment-plan-form';
import { TreatmentPlanStatusForm } from '../treatment-plan-status-form/treatment-plan-status-form';
import { TreatmentPlanItemForm } from '../treatment-plan-item-form/treatment-plan-item-form';
import {
  TreatmentPlanItemsStatusList,
  TreatmentPlanItemStatusChangeEvent,
} from '../treatment-plan-items-status-list/treatment-plan-items-status-list';
import { Modal } from '../../../shared/components/modal/modal';
import { BillTreatmentPlanItemModal } from '../bill-treatment-plan-item-modal/bill-treatment-plan-item-modal';
import { TreatmentPlansService } from '../../../core/services/treatment-plans.service';
import { TreatmentPlanItemsService } from '../../../core/services/treatment-plan-items.service';
import { TreatmentPlanOptionsService } from '../../../core/services/treatment-plan-options.service';
import { TreatmentPlan, TreatmentPlanStatusChangeDto } from '../../../core/models/treatment-plan.model';
import { TreatmentPlanItem, TreatmentPlanItemDto } from '../../../core/models/treatment-plan-item.model';
import { treatmentPlanDetailErrorMessage, treatmentPlanSaveErrorMessage } from '../../../shared/utils/treatment-plans-error.util';
import {
  treatmentPlanItemSaveErrorMessage,
  treatmentPlanItemStatusErrorMessage,
} from '../../../shared/utils/treatment-plan-items-error.util';

@Component({
  selector: 'app-treatment-plans-section',
  imports: [
    TreatmentPlansTable,
    TreatmentPlanStatusBadge,
    TreatmentPlanForm,
    TreatmentPlanStatusForm,
    TreatmentPlanItemForm,
    TreatmentPlanItemsStatusList,
    Modal,
    BillTreatmentPlanItemModal,
  ],
  templateUrl: './treatment-plans-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentPlansSection {
  private plansSvc = inject(TreatmentPlansService);
  private itemsSvc = inject(TreatmentPlanItemsService);
  private optionsSvc = inject(TreatmentPlanOptionsService);
  private statusForm = viewChild(TreatmentPlanStatusForm);
  private readonly createPlanForm = viewChild<TreatmentPlanForm>('createPlanForm');
  private readonly editPlanForm = viewChild<TreatmentPlanForm>('editPlanForm');
  private readonly addItemForm = viewChild(TreatmentPlanItemForm);
  private readonly itemsStatusList = viewChild(TreatmentPlanItemsStatusList);

  patientId = input.required<string>();

  // GET /tenants/patients/:patientId/treatment-plans — ya viene scopeado
  // al paciente desde el backend, no hace falta filtrar en el cliente.
  readonly plans = this.plansSvc.getAll();
  readonly listLoading = this.plansSvc.loading;
  readonly listError = this.plansSvc.error;
  readonly appointmentOptions = this.optionsSvc.appointments();

  // GET /tenants/treatment-plans/:id/items — loadForPlan() reemplaza todo
  // el cache, así que acá no hace falta filtrar por plan_id: siempre son
  // los items del plan actualmente abierto en el detalle.
  readonly items = this.itemsSvc.getAll();
  readonly itemsLoading = this.itemsSvc.loading;
  readonly itemsError = this.itemsSvc.error;

  selectedPlanId = signal<string | null>(null);
  editing = signal(false);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  creating = signal(false);
  saving = signal(false);
  actionError = signal<string | null>(null);

  planStatusSaving = signal(false);
  planStatusError = signal<string | null>(null);

  addingItem = signal(false);
  itemActionError = signal<string | null>(null);
  itemStatusSavingId = signal<string | null>(null);

  billingItem = signal<TreatmentPlanItem | null>(null);

  readonly selectedPlan = computed<TreatmentPlan | null>(() => {
    const id = this.selectedPlanId();
    return id ? (this.plans().find(p => p.id === id) ?? null) : null;
  });

  constructor() {
    effect(() => {
      this.plansSvc.loadForPatient(this.patientId());
    });
  }

  openDetail(plan: TreatmentPlan): void {
    this.selectedPlanId.set(plan.id);
    this.editing.set(false);
    this.addingItem.set(false);
    this.detailError.set(null);
    this.detailLoading.set(true);

    // GET /tenants/treatment-plans/:id — refresca con lo último del
    // backend; mientras tanto ya se ve la copia cacheada del listado
    // (sin pantalla en blanco).
    this.plansSvc.loadDetail(plan.id).subscribe({
      next: () => this.detailLoading.set(false),
      error: err => {
        this.detailLoading.set(false);
        this.detailError.set(treatmentPlanDetailErrorMessage(err));
      },
    });
    this.itemsSvc.loadForPlan(plan.id);
  }

  closeDetail(): void {
    this.selectedPlanId.set(null);
    this.editing.set(false);
    this.actionError.set(null);
  }

  openEdit(): void {
    this.actionError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.actionError.set(null);
    this.editing.set(false);
  }

  // POST /tenants/treatment-plans/:id/status — changeStatus ya vuelve a
  // pedir el detalle tras el POST, así que total_estimated queda como lo
  // dejó el backend (nunca se calcula acá).
  onPlanStatusChanged(dto: TreatmentPlanStatusChangeDto): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.planStatusSaving.set(true);
    this.planStatusError.set(null);
    this.plansSvc.changeStatus(plan.id, dto).subscribe({
      next: () => {
        this.planStatusSaving.set(false);
        this.statusForm()?.resetAfterSuccess();
      },
      error: err => {
        this.planStatusSaving.set(false);
        // Error de un campo: se marca en su input; el banner queda para lo que no es de un campo.
        this.planStatusError.set(this.statusForm()?.applyServerError(err) ? null : treatmentPlanSaveErrorMessage(err));
      },
    });
  }

  // POST /tenants/treatment-plans/:id/items/:itemId/status — changeStatus
  // ya vuelve a pedir el detalle del plan tras el POST (total_estimated
  // recalculado) y deja done_at/done_by reales en el item.
  onItemStatusChanged(event: TreatmentPlanItemStatusChangeEvent): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.itemStatusSavingId.set(event.itemId);
    this.itemActionError.set(null);
    this.itemsSvc.changeStatus(plan.id, event.itemId, event.dto).subscribe({
      next: () => this.itemStatusSavingId.set(null),
      error: err => {
        this.itemStatusSavingId.set(null);
        this.itemActionError.set(
          this.itemsStatusList()?.applyServerError(event.itemId, err) ? null : treatmentPlanItemStatusErrorMessage(err),
        );
      },
    });
  }

  openAddItem(): void {
    this.itemActionError.set(null);
    this.addingItem.set(true);
  }

  // POST /tenants/treatment-plans/:id/items — create() ya refresca el
  // total del plan tras guardar.
  onItemAdded(dto: TreatmentPlanItemDto): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.itemActionError.set(null);
    this.itemsSvc.create(plan.id, dto).subscribe({
      next: () => this.addingItem.set(false),
      // El form conserva los valores ([resetOnAdd]="false"): el campo rechazado queda marcado.
      error: err =>
        this.itemActionError.set(this.addItemForm()?.applyServerError(err) ? null : treatmentPlanItemSaveErrorMessage(err)),
    });
  }

  // DELETE /tenants/treatment-plans/:id/items/:itemId — remove() ya
  // refresca el total del plan tras guardar.
  onItemRemoved(itemId: string): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.itemActionError.set(null);
    this.itemsSvc.remove(plan.id, itemId).subscribe({
      error: err => this.itemActionError.set(treatmentPlanItemSaveErrorMessage(err)),
    });
  }

  openBill(item: TreatmentPlanItem): void {
    this.billingItem.set(item);
  }

  closeBill(): void {
    this.billingItem.set(null);
  }

  openCreate(): void {
    this.actionError.set(null);
    this.creating.set(true);
  }

  closeCreate(): void {
    this.creating.set(false);
  }

  // POST /tenants/patients/:patientId/treatment-plans — el alta persiste
  // y aparece en el listado sin recargar la página. Cada item se crea
  // con un POST real (create() de TreatmentPlanItemsService ya refresca
  // el total del plan después de cada uno).
  onCreate(payload: TreatmentPlanSubmitPayload): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.plansSvc.create(this.patientId(), payload.plan).subscribe({
      next: plan => {
        const itemRequests = payload.items.map(dto => this.itemsSvc.create(plan.id, dto));
        (itemRequests.length ? forkJoin(itemRequests) : of([])).subscribe({
          next: () => {
            this.saving.set(false);
            this.creating.set(false);
          },
          error: err => {
            // El plan ya quedó creado (y visible en el listado) aunque
            // algún item haya fallado — el error se muestra igual.
            this.saving.set(false);
            this.actionError.set(treatmentPlanItemSaveErrorMessage(err));
          },
        });
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.createPlanForm()?.applyServerError(err) ? null : treatmentPlanSaveErrorMessage(err));
      },
    });
  }

  // PATCH /tenants/treatment-plans/:id — solo notes/currency (los items
  // se manejan desde su propia sección en el detalle).
  onSaveEdit(payload: TreatmentPlanSubmitPayload): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.plansSvc.update(plan.id, payload.plan).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.editPlanForm()?.applyServerError(err) ? null : treatmentPlanSaveErrorMessage(err));
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(amount: number, currency: string): string {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
