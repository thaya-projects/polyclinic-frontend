import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { PlansFilters } from '../plans-filters/plans-filters';
import { PlansTable } from '../plans-table/plans-table';
import { PlanForm } from '../plan-form/plan-form';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Modal } from '../../../../shared/components/modal/modal';
import { ConfirmDialog, ConfirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { PlansService } from '../../../../core/services/plans.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { CreatePlanDto, Plan, UpdatePlanDto } from '../../../../core/models/plan.model';
import { httpErrorMessage } from '../../../../shared/utils/http-error.util';

const PAGE_SIZE = 8;

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-plans-page',
  imports: [PlansFilters, PlansTable, Pagination, Modal, ConfirmDialog, PlanForm],
  templateUrl: './plans-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansPage {
  private plansSvc = inject(PlansService);
  private allPlans = this.plansSvc.getAll();

  readonly listLoading = this.plansSvc.loading;
  readonly listError = this.plansSvc.error;

  readonly pageSize = PAGE_SIZE;

  search = signal('');
  filters = signal<Record<string, string>>({});
  page = signal(1);

  modalMode = signal<ModalMode>('none');
  selectedPlan = signal<Plan | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  // Toggle activo/desactivo con confirmación — se guarda el plan objetivo mientras el
  // ConfirmDialog está abierto para poder mostrar su nombre en el mensaje.
  planToToggle = signal<Plan | null>(null);
  togglingActive = signal(false);
  toggleError = signal<string | null>(null);

  readonly confirmingToggle = computed(() => this.planToToggle() !== null);
  confirmTitle = computed(() => (this.planToToggle()?.is_active ? 'Desactivar plan' : 'Activar plan'));
  confirmMessage = computed(() => {
    const plan = this.planToToggle();
    if (!plan) return '';
    return plan.is_active
      ? `El plan "${plan.name}" dejará de ofrecerse a nuevos tenants. Las subscripciones vigentes que ya lo usan siguen intactas.`
      : `Se volverá a habilitar "${plan.name}" para nuevas subscripciones.`;
  });
  confirmLabel = computed(() => (this.planToToggle()?.is_active ? 'Desactivar' : 'Activar'));
  confirmTone = computed<ConfirmTone>(() => (this.planToToggle()?.is_active ? 'danger' : 'default'));

  filteredPlans = computed(() => {
    const term = this.search().toLowerCase().trim();
    const isActiveFilter = this.filters()['is_active'];

    return this.allPlans().filter(p => {
      if (term && !p.code.toLowerCase().includes(term) && !p.name.toLowerCase().includes(term)) return false;
      if (isActiveFilter === 'true' && !p.is_active) return false;
      if (isActiveFilter === 'false' && p.is_active) return false;
      return true;
    });
  });

  pagedPlans = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredPlans().slice(start, start + this.pageSize);
  });

  constructor() {
    inject(PageTitleService).set('Planes');
    this.plansSvc.load();

    // Reset a página 1 cuando cambian los filtros o la búsqueda (mismo criterio que TenantsPage).
    effect(() => {
      this.search();
      this.filters();
      this.page.set(1);
    });
  }

  openCreateModal(): void {
    this.selectedPlan.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(plan: Plan): void {
    this.selectedPlan.set(plan);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedPlan.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreatePlanDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.plansSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.page.set(1);
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  onSaveEdit(dto: UpdatePlanDto): void {
    const plan = this.selectedPlan();
    if (!plan) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.plansSvc.update(plan.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  requestToggleActive(plan: Plan): void {
    this.toggleError.set(null);
    this.planToToggle.set(plan);
  }

  cancelToggleActive(): void {
    if (this.togglingActive()) return;
    this.planToToggle.set(null);
  }

  confirmToggleActive(): void {
    const plan = this.planToToggle();
    if (!plan) return;

    this.togglingActive.set(true);
    this.toggleError.set(null);
    this.plansSvc.setActive(plan.id, !plan.is_active).subscribe({
      next: () => {
        this.togglingActive.set(false);
        this.planToToggle.set(null);
      },
      error: err => {
        this.togglingActive.set(false);
        this.toggleError.set(httpErrorMessage(err));
        // Se cierra el diálogo aunque falle: el error se muestra como banner sobre la tabla.
        this.planToToggle.set(null);
      },
    });
  }
}
