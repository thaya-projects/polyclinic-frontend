import { Directive, TemplateRef, input } from '@angular/core';

// Permite proyectar una celda custom por columna:
//   <ng-template appDataTableCell="status" let-row>...</ng-template>
// en vez de acoplar app-data-table a un dominio específico.
@Directive({ selector: 'ng-template[appDataTableCell]' })
export class DataTableCellDirective {
  readonly columnKey = input.required<string>({ alias: 'appDataTableCell' });

  constructor(readonly templateRef: TemplateRef<{ $implicit: any }>) {}
}
