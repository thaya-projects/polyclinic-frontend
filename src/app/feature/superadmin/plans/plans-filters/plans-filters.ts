import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ListFilters } from '../../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../../shared/components/list-filters/list-filter.model';

const IS_ACTIVE_OPTIONS = [
  { value: 'true', label: 'Activo', tone: 'ok' as const },
  { value: 'false', label: 'Inactivo', tone: 'neutral' as const },
];

@Component({
  selector: 'app-plans-filters',
  imports: [ListFilters],
  templateUrl: './plans-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansFilters {
  search = model('');
  values = model<Record<string, string>>({});

  readonly filterConfigs: ListFilterConfig[] = [
    { key: 'is_active', label: 'Estado', options: IS_ACTIVE_OPTIONS },
  ];
}
