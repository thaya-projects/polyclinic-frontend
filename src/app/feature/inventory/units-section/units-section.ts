import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { UnitOfMeasureForm } from '../unit-of-measure-form/unit-of-measure-form';
import { UnitsOfMeasureService } from '../../../core/services/units-of-measure.service';
import { CreateUnitOfMeasureDto, UnitOfMeasure } from '../../../core/models/unit-of-measure.model';
import { unitSaveErrorMessage, unitStatusErrorMessage } from '../../../shared/utils/units-error.util';

type ModalMode = 'none' | 'create' | 'edit';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'code', label: 'Código' },
  { key: 'is_active', label: 'Activa', align: 'center' },
  { key: 'actions', label: '', align: 'right' },
];

@Component({
  selector: 'app-units-section',
  imports: [DataTable, DataTableCellDirective, Modal, StatusChip, UnitOfMeasureForm],
  templateUrl: './units-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsSection {
  private unitsSvc = inject(UnitsOfMeasureService);
  private unitForm = viewChild<UnitOfMeasureForm>('unitForm');

  readonly columns = COLUMNS;

  readonly units = this.unitsSvc.getAll();
  readonly listLoading = this.unitsSvc.loading;
  readonly listError = this.unitsSvc.error;

  readonly rows = computed(() => this.units() as unknown as Record<string, unknown>[]);

  modalMode = signal<ModalMode>('none');
  selectedUnit = signal<UnitOfMeasure | null>(null);
  saving = signal(false);
  actionError = signal<string | null>(null);

  statusError = signal<string | null>(null);

  openCreateModal(): void {
    this.selectedUnit.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEditModal(unit: UnitOfMeasure): void {
    this.selectedUnit.set(unit);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedUnit.set(null);
    this.actionError.set(null);
  }

  submitForm(): void {
    this.unitForm()?.submit();
  }

  onSave(dto: CreateUnitOfMeasureDto): void {
    const unit = this.selectedUnit();
    this.saving.set(true);
    this.actionError.set(null);

    const request$ = unit ? this.unitsSvc.update(unit.id, dto) : this.unitsSvc.create(dto);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.unitForm()?.applyServerError(err) ? null : unitSaveErrorMessage(err));
      },
    });
  }

  onToggleActive(unit: UnitOfMeasure): void {
    this.statusError.set(null);
    this.unitsSvc.setActive(unit.id, !unit.is_active).subscribe({
      error: err => this.statusError.set(unitStatusErrorMessage(err)),
    });
  }
}
