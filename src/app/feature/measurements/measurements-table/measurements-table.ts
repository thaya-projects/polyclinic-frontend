import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { Measurement, measurementTypeLabel } from '../../../core/models/measurement.model';
import { formatMeasuredAt, formatMeasurementValue } from '../measurement-format.util';

// Fase 4 T3: listado de mediciones — PRESENTACIONAL (recibe la lista ya resuelta, en el orden en
// que llega: measured_at desc). Tipo con etiqueta en español (un tipo libre se muestra con su
// código), fecha y hora local y link al encuentro si la medición viene de uno.
@Component({
  selector: 'app-measurements-table',
  imports: [DataTable, DataTableCellDirective, RouterLink],
  templateUrl: './measurements-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeasurementsTable {
  measurements = input.required<Measurement[]>();
  emptyMessage = input('Sin mediciones registradas.');
  // Locale del tenant (números y fechas).
  locale = input('es');

  rows = computed(() => this.measurements() as unknown as Record<string, unknown>[]);

  readonly typeLabel = measurementTypeLabel;
  formatDate(iso: string): string {
    return formatMeasuredAt(iso, this.locale());
  }

  formatValue(value: number): string {
    return formatMeasurementValue(value, this.locale());
  }

  encounterLinkLabel(row: Measurement): string {
    return `Ver el encuentro de la medición de ${measurementTypeLabel(row.type)} del ${this.formatDate(row.measured_at)}`;
  }

  readonly columns: DataTableColumn[] = [
    { key: 'type', label: 'Tipo' },
    { key: 'value', label: 'Valor', align: 'right', width: '110px' },
    { key: 'unit', label: 'Unidad', width: '100px' },
    { key: 'measured_at', label: 'Fecha y hora', width: '180px' },
    { key: 'note', label: 'Nota' },
    { key: 'encounter', label: 'Encuentro', align: 'right', width: '120px' },
  ];
}
