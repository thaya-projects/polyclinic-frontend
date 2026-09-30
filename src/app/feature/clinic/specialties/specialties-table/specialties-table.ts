import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Specialty } from '../../../../core/models/specialty.model';

@Component({
  selector: 'app-specialties-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './specialties-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtiesTable {
  specialties = input.required<Specialty[]>();
  // Id de la specialty cuyo toggle está en vuelo — deshabilita solo esa fila (no la tabla entera)
  // para evitar doble click / doble PATCH concurrente.
  togglingId = input<string | null>(null);

  edit = output<Specialty>();
  toggleActive = output<Specialty>();

  rows = computed(() => this.specialties() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código', width: '200px' },
    { key: 'scope', label: 'Alcance', align: 'center', width: '120px' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '200px' },
  ];
}
