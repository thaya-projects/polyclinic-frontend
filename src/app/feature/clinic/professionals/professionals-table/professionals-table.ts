import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { Professional } from '../../../../core/models/professional.model';

@Component({
  selector: 'app-professionals-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './professionals-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalsTable {
  professionals = input.required<Professional[]>();
  // Mapa id → nombre de specialty para pintar chips en la fila (evita N joins en el service).
  specialtyNameById = input.required<Record<string, string>>();

  edit = output<Professional>();
  deactivate = output<Professional>();

  rows = computed(() => this.professionals() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'specialties', label: 'Especialidades' },
    { key: 'email', label: 'Email', width: '220px' },
    { key: 'phone', label: 'Teléfono', width: '140px' },
    { key: 'is_active', label: 'Estado', align: 'center', width: '120px' },
    { key: 'actions', label: '', align: 'right', width: '160px' },
  ];

  specialtyNamesFor(ids: string[] | undefined): string[] {
    if (!ids) return [];
    const map = this.specialtyNameById();
    return ids.map(id => map[id] ?? id);
  }
}
