import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { MaterialForm } from '../material-form/material-form';
import { MaterialsService } from '../../../core/services/materials.service';
import { CreateMaterialDto, Material, MaterialCategory, MaterialsQuery } from '../../../core/models/material.model';
import { MATERIAL_CATEGORIES, materialCategoryLabel } from '../../../core/constants/material-category.const';
import { materialSaveErrorMessage, materialStatusErrorMessage } from '../../../shared/utils/materials-error.util';

const PAGE_SIZE = 10;

type ModalMode = 'none' | 'create' | 'edit';
type ActiveFilter = 'all' | 'true' | 'false';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'code', label: 'Código' },
  { key: 'category', label: 'Categoría' },
  { key: 'unit_of_measure_name', label: 'Unidad' },
  { key: 'unit_cost', label: 'Costo unitario', align: 'right' },
  { key: 'min_stock', label: 'Stock mínimo', align: 'right' },
  { key: 'is_active', label: 'Activo', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
];

@Component({
  selector: 'app-materials-section',
  imports: [FormsModule, DataTable, DataTableCellDirective, Pagination, Modal, StatusChip, MaterialForm],
  templateUrl: './materials-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialsSection {
  private materialsSvc = inject(MaterialsService);
  private materialForm = viewChild<MaterialForm>('materialForm');

  readonly columns = COLUMNS;
  readonly categories = MATERIAL_CATEGORIES;
  readonly categoryLabel = materialCategoryLabel;

  readonly materials = this.materialsSvc.getAll();
  readonly total = this.materialsSvc.total;
  readonly listLoading = this.materialsSvc.loading;
  readonly listError = this.materialsSvc.error;

  readonly rows = computed(() => this.materials() as unknown as Record<string, unknown>[]);

  readonly pageSize = PAGE_SIZE;
  page = signal(1);
  categoryFilter = signal<MaterialCategory | 'all'>('all');
  activeFilter = signal<ActiveFilter>('true');

  modalMode = signal<ModalMode>('none');
  selectedMaterial = signal<Material | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  statusError = signal<string | null>(null);

  constructor() {
    // Vuelve a la página 1 cada vez que cambia un filtro.
    effect(() => {
      this.categoryFilter();
      this.activeFilter();
      this.page.set(1);
    });

    // GET /tenants/materials — se vuelve a pedir cada vez que cambia un filtro o la página.
    effect(() => {
      this.reload();
    });
  }

  private currentQuery(): MaterialsQuery {
    const category = this.categoryFilter();
    const active = this.activeFilter();
    return {
      page: this.page(),
      limit: this.pageSize,
      is_active: active === 'all' ? undefined : active === 'true',
      category: category === 'all' ? undefined : category,
    };
  }

  private reload(): void {
    this.materialsSvc.load(this.currentQuery());
  }

  openCreateModal(): void {
    this.selectedMaterial.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEditModal(material: Material): void {
    this.selectedMaterial.set(material);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedMaterial.set(null);
    this.actionError.set(null);
  }

  submitForm(): void {
    this.materialForm()?.submit();
  }

  onSave(dto: CreateMaterialDto): void {
    const material = this.selectedMaterial();
    this.saving.set(true);
    this.actionError.set(null);

    const request$ = material ? this.materialsSvc.update(material.id, dto) : this.materialsSvc.create(dto);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        if (!material) {
          this.page.set(1);
          this.reload();
        }
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.materialForm()?.applyServerError(err) ? null : materialSaveErrorMessage(err));
      },
    });
  }

  onToggleActive(material: Material): void {
    this.statusError.set(null);
    this.materialsSvc.setActive(material.id, !material.is_active).subscribe({
      error: err => this.statusError.set(materialStatusErrorMessage(err)),
    });
  }
}
