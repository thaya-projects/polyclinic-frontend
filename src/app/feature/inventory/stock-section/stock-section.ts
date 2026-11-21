import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { Modal } from '../../../shared/components/modal/modal';
import { StockMovementForm } from '../stock-movement-form/stock-movement-form';
import { StockTransferForm } from '../stock-transfer-form/stock-transfer-form';
import { StockService } from '../../../core/services/stock.service';
import { MaterialsService } from '../../../core/services/materials.service';
import { BranchesService } from '../../../core/services/branches.service';
import { CreateStockMovementDto, TransferStockDto } from '../../../core/models/stock.model';
import { stockMovementSaveErrorMessage, stockTransferErrorMessage } from '../../../shared/utils/stock-error.util';

type ModalMode = 'none' | 'movement' | 'transfer';
type StockViewMode = 'total' | 'branch';

const BY_BRANCH_COLUMNS: DataTableColumn[] = [
  { key: 'branch_id', label: 'Sucursal' },
  { key: 'material_name', label: 'Material' },
  { key: 'quantity', label: 'Cantidad', align: 'right' },
];

const TOTAL_COLUMNS: DataTableColumn[] = [
  { key: 'material_name', label: 'Material' },
  { key: 'quantity', label: 'Cantidad', align: 'right' },
];

@Component({
  selector: 'app-stock-section',
  imports: [DataTable, DataTableCellDirective, Modal, StockMovementForm, StockTransferForm],
  templateUrl: './stock-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockSection {
  private stockSvc = inject(StockService);
  private materialsSvc = inject(MaterialsService);
  private branchesSvc = inject(BranchesService);
  private movementForm = viewChild<StockMovementForm>('movementForm');
  private transferForm = viewChild<StockTransferForm>('transferForm');

  readonly byBranchColumns = BY_BRANCH_COLUMNS;
  readonly totalColumns = TOTAL_COLUMNS;

  readonly summary = this.stockSvc.summary;
  readonly summaryLoading = this.stockSvc.loading;
  readonly summaryError = this.stockSvc.error;

  readonly branches = this.branchesSvc.getAll();
  readonly activeMaterials = computed(() => this.materialsSvc.getAll()().filter(m => m.is_active));

  readonly byBranchRows = computed(() => this.summary().by_branch as unknown as Record<string, unknown>[]);
  readonly totalRows = computed(() => this.summary().total_clinic as unknown as Record<string, unknown>[]);

  // Por defecto el admin ve el total de la clínica; "Por sucursal" es la vista detallada.
  viewMode = signal<StockViewMode>('total');

  modalMode = signal<ModalMode>('none');
  saving = signal(false);
  actionError = signal<string | null>(null);

  constructor() {
    this.stockSvc.loadSummary();
    // Para poblar los selects de los forms (branches ya se auto-carga en su propio service).
    this.materialsSvc.load({ page: 1, limit: 200, is_active: true });
  }

  branchName(id: string): string {
    return this.branchesSvc.find(id)?.name ?? id;
  }

  setViewMode(mode: StockViewMode): void {
    this.viewMode.set(mode);
  }

  openMovement(): void {
    this.actionError.set(null);
    this.modalMode.set('movement');
  }

  openTransfer(): void {
    this.actionError.set(null);
    this.modalMode.set('transfer');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.actionError.set(null);
  }

  submitMovement(): void {
    this.movementForm()?.submit();
  }

  submitTransfer(): void {
    this.transferForm()?.submit();
  }

  onMovementSubmit(dto: CreateStockMovementDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.stockSvc.registerMovement(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.movementForm()?.applyServerError(err) ? null : stockMovementSaveErrorMessage(err));
      },
    });
  }

  onTransferSubmit(dto: TransferStockDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.stockSvc.transferStock(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(this.transferForm()?.applyServerError(err) ? null : stockTransferErrorMessage(err));
      },
    });
  }
}
