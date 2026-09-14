import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ListFilters } from '../../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../../shared/components/list-filters/list-filter.model';
import { COUNTRIES } from '../../../../core/constants/countries.const';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo', tone: 'ok' as const },
  { value: 'trial', label: 'Trial', tone: 'wait' as const },
  { value: 'suspended', label: 'Suspendido', tone: 'neutral' as const },
  { value: 'cancelled', label: 'Cancelado', tone: 'neutral' as const },
];

@Component({
  selector: 'app-tenants-filters',
  imports: [ListFilters],
  templateUrl: './tenants-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsFilters {
  search = model('');
  values = model<Record<string, string>>({});

  readonly filterConfigs: ListFilterConfig[] = [
    { key: 'countryCode', label: 'País', options: COUNTRIES },
    { key: 'status', label: 'Estado', options: STATUS_OPTIONS },
  ];
}
