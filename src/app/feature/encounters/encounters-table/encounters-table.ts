import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { EncounterStatusBadge } from '../encounter-status-badge/encounter-status-badge';
import { EncounterSummary } from '../../../core/models/encounter.model';
import { formatEncounterDateTime } from '../encounter-format.util';

// Desacoplado de la fuente de datos: recibe la lista ya resuelta + mapas id → nombre. Trabaja con
// el resumen del listado (EncounterSummary), sin contenido clínico.
@Component({
  selector: 'app-encounters-table',
  imports: [DataTable, DataTableCellDirective, EncounterStatusBadge],
  templateUrl: './encounters-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncountersTable {
  encounters = input.required<EncounterSummary[]>();
  patientNameById = input<Record<string, string>>({});
  professionalNameById = input<Record<string, string>>({});

  view = output<EncounterSummary>();

  rows = computed(() => this.encounters() as unknown as Record<string, unknown>[]);

  readonly formatDate = formatEncounterDateTime;

  readonly columns: DataTableColumn[] = [
    { key: 'encounter_date', label: 'Fecha', width: '170px' },
    { key: 'patient', label: 'Paciente' },
    { key: 'professional', label: 'Profesional' },
    { key: 'chief_complaint', label: 'Motivo de consulta' },
    { key: 'status', label: 'Estado', align: 'center', width: '110px' },
    { key: 'actions', label: '', align: 'right', width: '90px' },
  ];

  patientName(id: string): string {
    return this.patientNameById()[id] ?? '—';
  }

  professionalName(id: string): string {
    return this.professionalNameById()[id] ?? '—';
  }
}
