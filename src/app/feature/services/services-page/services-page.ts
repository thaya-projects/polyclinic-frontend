import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ServicesByCategory } from '../services-by-category/services-by-category';
import { ServiceForm } from '../service-form/service-form';
import { Modal } from '../../../shared/components/modal/modal';
import { ServiceCategoriesService } from '../../../core/services/service-categories.service';
import { ServicesService } from '../../../core/services/services.service';
import { Service, ServiceDto } from '../../../core/models/service.model';
import { PageTitleService } from '../../../core/services/page-title.service';
import { serviceSaveErrorMessage, serviceStatusErrorMessage } from '../../../shared/utils/services-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-services-page',
  imports: [ServicesByCategory, ServiceForm, Modal],
  templateUrl: './services-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPage {
  private categoriesSvc = inject(ServiceCategoriesService);
  private servicesSvc = inject(ServicesService);

  readonly categories = this.categoriesSvc.getAll();
  readonly services = this.servicesSvc.getAll();

  readonly categoriesError = this.categoriesSvc.error;
  readonly listLoading = this.servicesSvc.loading;
  readonly listError = this.servicesSvc.error;

  modalMode = signal<ModalMode>('none');
  selectedService = signal<Service | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  statusError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Catálogo de servicios');
    this.categoriesSvc.load();
    this.servicesSvc.load();
  }

  openCreateModal(): void {
    this.selectedService.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEditModal(service: Service): void {
    this.selectedService.set(service);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedService.set(null);
    this.actionError.set(null);
  }

  onSave(dto: ServiceDto): void {
    const service = this.selectedService();
    this.saving.set(true);
    this.actionError.set(null);

    const request$ = service ? this.servicesSvc.update(service.id, dto) : this.servicesSvc.create(dto);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(serviceSaveErrorMessage(err));
      },
    });
  }

  onToggleActive(service: Service): void {
    this.statusError.set(null);
    this.servicesSvc.setActive(service.id, !service.is_active).subscribe({
      error: err => this.statusError.set(serviceStatusErrorMessage(err)),
    });
  }
}
