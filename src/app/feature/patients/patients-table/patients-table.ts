import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { Patient } from '../../../core/models/patient.model';
import { documentTypeLabel } from '../../../core/constants/patient-options.const';

@Component({
  selector: 'app-patients-table',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './patients-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientsTable {
  // Desacoplado de la fuente de datos (criterio de aceptación T6): solo
  // recibe la lista ya resuelta, sin saber si viene de un mock o de HTTP.
  patients = input.required<Patient[]>();

  view = output<Patient>();

  // app-data-table trabaja con filas genéricas; Patient no tiene index
  // signature, así que se castea una sola vez acá para el binding.
  rows = computed(() => this.patients() as unknown as Record<string, unknown>[]);

  readonly columns: DataTableColumn[] = [
    { key: 'name', label: 'Paciente' },
    { key: 'document', label: 'Documento' },
    { key: 'whatsapp_phone', label: 'WhatsApp' },
    { key: 'is_active', label: 'Activo', align: 'center', width: '90px' },
    { key: 'actions', label: '', align: 'right', width: '90px' },
  ];

  documentLabel(row: Patient): string {
    return `${documentTypeLabel(row.document_type)} ${row.document_number}`;
  }
}
