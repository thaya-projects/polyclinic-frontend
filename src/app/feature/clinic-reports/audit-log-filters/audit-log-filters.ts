import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

// Desacoplado de la fuente de datos: recibe la lista de entidades ya
// resuelta por el contenedor (no es un enum del schema, es "text" — no
// sabe que esa lista sale del propio mock).
@Component({
  selector: 'app-audit-log-filters',
  imports: [],
  templateUrl: './audit-log-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogFilters {
  entities = input.required<string[]>();

  from = model('');
  to = model('');
  entity = model('');

  onFromChange(value: string): void {
    this.from.set(value);
  }

  onToChange(value: string): void {
    this.to.set(value);
  }

  onEntityChange(value: string): void {
    this.entity.set(value);
  }
}
