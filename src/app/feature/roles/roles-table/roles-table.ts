import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { ClinicRole, isSystemRole } from '../../../core/models/clinic-role.model';

@Component({
  selector: 'app-roles-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './roles-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesTable {
  // Desacoplado de la fuente de datos (criterio de aceptación T12): solo
  // recibe la lista ya resuelta, sin saber si viene de un mock o de HTTP.
  roles = input.required<ClinicRole[]>();

  // T13: abre el form de edición (o solo-lectura si es de sistema) para esa fila.
  edit = output<ClinicRole>();
  // T15: pide confirmación de borrado — un rol de sistema nunca la emite
  // (no tiene botón de eliminar).
  remove = output<ClinicRole>();

  // app-data-table trabaja con filas genéricas; ClinicRole no tiene index
  // signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.roles() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Rol' },
    { key: 'code', label: 'Código' },
    { key: 'permissions', label: 'Permisos', align: 'center', width: '110px' },
    { key: 'origin', label: 'Origen', align: 'center', width: '140px' },
    { key: 'actions', label: '', align: 'right', width: '160px' },
  ];

  isSystem(role: ClinicRole): boolean {
    return isSystemRole(role);
  }
}
