import { ChangeDetectionStrategy, Component, contentChildren, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DataTableColumn } from './data-table-column.model';
import { DataTableCellDirective } from './data-table-cell.directive';

// Tabla genérica y reutilizable: recibe columnas + filas planas y, para
// cualquier columna que necesite un render especial (chips, fechas,
// acciones...), el consumidor proyecta un <ng-template appDataTableCell="key">.
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  columns = input.required<DataTableColumn[]>();
  rows = input.required<Record<string, unknown>[]>();
  rowKey = input<(row: Record<string, unknown>) => string | number>(
    row => (row['id'] as string | number) ?? JSON.stringify(row),
  );
  emptyMessage = input('Sin resultados.');

  cellTemplates = contentChildren(DataTableCellDirective);

  templateFor(key: string) {
    return this.cellTemplates().find(t => t.columnKey() === key)?.templateRef ?? null;
  }

  value(row: Record<string, unknown>, key: string): unknown {
    return row[key];
  }

  alignClass(align?: 'left' | 'center' | 'right'): string {
    return align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  }
}
