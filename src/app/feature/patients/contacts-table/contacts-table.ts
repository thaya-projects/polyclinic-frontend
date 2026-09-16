import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { PatientContact } from '../../../core/models/patient-contact.model';

@Component({
  selector: 'app-contacts-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './contacts-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactsTable {
  // Desacoplado de la fuente de datos (criterio de aceptación T4): solo
  // recibe la lista ya resuelta, sin saber si viene de un mock o de HTTP.
  contacts = input.required<PatientContact[]>();

  setPrimary = output<PatientContact>();
  edit = output<PatientContact>();
  remove = output<PatientContact>();

  // app-data-table trabaja con filas genéricas; PatientContact no tiene
  // index signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.contacts() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'relationship', label: 'Relación' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'is_primary', label: 'Principal', align: 'center', width: '110px' },
    { key: 'actions', label: '', align: 'right', width: '230px' },
  ];
}
