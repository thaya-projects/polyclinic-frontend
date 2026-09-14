import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { TenantsFilters } from '../tenants-filters/tenants-filters';
import { TenantsTable } from '../tenants-table/tenants-table';
import { CreateTenantForm } from '../create-tenant-form/create-tenant-form';
import { TenantDetailPage } from '../tenant-detail-page/tenant-detail-page';
import { EditTenantForm } from '../edit-tenant-form/edit-tenant-form';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Modal } from '../../../../shared/components/modal/modal';
import { ConfirmDialog, ConfirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { TenantsService } from '../../../../core/services/tenants.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { CreateTenantDto } from '../../../../core/models/create-tenant.model';
import { EditTenantDto, TenantDetail } from '../../../../core/models/tenant-detail.model';
import { httpErrorMessage } from '../../../../shared/utils/http-error.util';

const PAGE_SIZE = 8;

type ModalMode = 'none' | 'create' | 'detail' | 'edit';

@Component({
  selector: 'app-tenants-page',
  imports: [TenantsFilters, TenantsTable, Pagination, Modal, ConfirmDialog, CreateTenantForm, TenantDetailPage, EditTenantForm],
  templateUrl: './tenants-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsPage {
  private tenantsSvc = inject(TenantsService);
  private allTenants = this.tenantsSvc.getAll();

  readonly listLoading = this.tenantsSvc.loading;
  readonly listError = this.tenantsSvc.error;

  readonly pageSize = PAGE_SIZE;

  search = signal('');
  filters = signal<Record<string, string>>({});
  page = signal(1);

  modalMode = signal<ModalMode>('none');
  selectedTenantId = signal<string | null>(null);
  selectedTenant = signal<TenantDetail | null>(null);

  detailLoading = signal(false);
  saving = signal(false);
  actionError = signal<string | null>(null);

  confirmingToggle = signal(false);
  togglingActive = signal(false);

  confirmTitle = computed(() => (this.selectedTenant()?.is_active ? 'Suspender tenant' : 'Activar tenant'));

  confirmMessage = computed(() => {
    const tenant = this.selectedTenant();
    if (!tenant) return '';
    return tenant.is_active
      ? `El tenant "${tenant.name}" no se eliminará, solo quedará suspendido. Mientras esté suspendido, sus usuarios (app_user) no podrán iniciar sesión.`
      : `Se reactivará "${tenant.name}". Sus usuarios (app_user) podrán volver a iniciar sesión con normalidad.`;
  });

  confirmLabel = computed(() => (this.selectedTenant()?.is_active ? 'Suspender' : 'Activar'));
  confirmTone = computed<ConfirmTone>(() => (this.selectedTenant()?.is_active ? 'danger' : 'default'));

  filteredTenants = computed(() => {
    const term = this.search().toLowerCase().trim();
    const { countryCode, status } = this.filters();

    return this.allTenants().filter(t => {
      if (term && !t.name.toLowerCase().includes(term) && !t.slug.toLowerCase().includes(term)) return false;
      if (countryCode && t.countryCode !== countryCode) return false;
      if (status && t.status !== status) return false;
      return true;
    });
  });

  pagedTenants = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredTenants().slice(start, start + this.pageSize);
  });

  constructor() {
    inject(PageTitleService).set('Tenants');
    this.tenantsSvc.load();

    // Vuelve a la página 1 cada vez que cambian los filtros o la búsqueda.
    effect(() => {
      this.search();
      this.filters();
      this.page.set(1);
    });
  }

  openCreateModal(): void {
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openDetail(tenant: { id: string }): void {
    this.selectedTenantId.set(tenant.id);
    this.selectedTenant.set(null);
    this.actionError.set(null);
    this.modalMode.set('detail');
    this.detailLoading.set(true);

    this.tenantsSvc.loadDetail(tenant.id).subscribe({
      next: detail => {
        this.selectedTenant.set(detail);
        this.detailLoading.set(false);
      },
      error: err => {
        this.detailLoading.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  openEdit(): void {
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  backToDetail(): void {
    this.actionError.set(null);
    this.modalMode.set('detail');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedTenantId.set(null);
    this.selectedTenant.set(null);
    this.actionError.set(null);
    this.confirmingToggle.set(false);
  }

  onCreate(dto: CreateTenantDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.tenantsSvc.create(dto).subscribe({
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

  onSaveEdit(dto: EditTenantDto): void {
    const id = this.selectedTenantId();
    if (!id) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.tenantsSvc.update(id, dto).subscribe({
      next: updated => {
        this.saving.set(false);
        this.selectedTenant.set(updated);
        this.modalMode.set('detail');
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  // T19 — no se ejecuta directo: primero pide confirmación.
  requestToggleActive(): void {
    this.confirmingToggle.set(true);
  }

  cancelToggleActive(): void {
    this.confirmingToggle.set(false);
  }

  confirmToggleActive(): void {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    this.togglingActive.set(true);
    this.actionError.set(null);
    this.tenantsSvc.setActive(tenant.id, !tenant.is_active).subscribe({
      next: updated => {
        this.togglingActive.set(false);
        this.confirmingToggle.set(false);
        this.selectedTenant.set(updated);
      },
      error: err => {
        this.togglingActive.set(false);
        this.confirmingToggle.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }
}
