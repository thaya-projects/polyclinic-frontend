import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table-column.model';
import { DataTableCellDirective } from '../../../shared/components/data-table/data-table-cell.directive';
import { StatusChip } from '../../../shared/components/status-chip/status-chip';
import { Service } from '../../../core/models/service.model';
import { ServiceCategory } from '../../../core/models/service-category.model';

export interface ServiceGroup {
  category: ServiceCategory | null;
  services: Service[];
}

@Component({
  selector: 'app-services-by-category',
  imports: [DataTable, DataTableCellDirective, StatusChip],
  templateUrl: './services-by-category.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesByCategory {
  // Desacoplado de la fuente de datos (criterio de aceptación T5): solo
  // recibe las listas ya resueltas, sin saber si vienen de un mock o de HTTP.
  categories = input.required<ServiceCategory[]>();
  services = input.required<Service[]>();

  edit = output<Service>();
  // T6: activar/desactivar — se refleja al instante (PATCH parcial), sin
  // recargar todo el catálogo.
  toggleActive = output<Service>();

  readonly columns: DataTableColumn[] = [
    { key: 'code', label: 'Código', width: '100px' },
    { key: 'name', label: 'Servicio' },
    { key: 'duration_minutes', label: 'Duración', align: 'center', width: '110px' },
    { key: 'price', label: 'Precio', align: 'right', width: '130px' },
    { key: 'is_active', label: 'Activo', align: 'center', width: '90px' },
    { key: 'actions', label: '', align: 'right', width: '190px' },
  ];

  readonly groups = computed<ServiceGroup[]>(() => {
    const cats = this.categories();
    const svcs = this.services();

    const groups: ServiceGroup[] = cats.map(category => ({
      category,
      services: svcs.filter(s => s.category_id === category.id),
    }));

    const uncategorized = svcs.filter(s => !cats.some(c => c.id === s.category_id));
    if (uncategorized.length) groups.push({ category: null, services: uncategorized });

    return groups;
  });

  rowsFor(services: Service[]): Record<string, unknown>[] {
    return services as unknown as Record<string, unknown>[];
  }
}
