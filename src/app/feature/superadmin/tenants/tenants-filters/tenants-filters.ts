import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ListFilters } from '../../../../shared/components/list-filters/list-filters';
import { ListFilterConfig } from '../../../../shared/components/list-filters/list-filter.model';
import { COUNTRIES } from '../../../../core/constants/countries.const';

// Refleja Domain.Enums.SubscriptionStatus (backend) — mismo mapeo que tenants-table.ts/
// subscription-status-badge.ts. "Suspendido"/"Activo" como ESTADO DEL TENANT (is_active) es un
// concepto aparte, ya representado por la columna "Activo" de la tabla — este filtro es
// puramente sobre el status de la subscription.
const STATUS_OPTIONS = [
  { value: 'trialing', label: 'Trial', tone: 'wait' as const },
  { value: 'active', label: 'Activa', tone: 'ok' as const },
  { value: 'past_due', label: 'Pago vencido', tone: 'neutral' as const },
  { value: 'canceled', label: 'Cancelada', tone: 'neutral' as const },
  { value: 'unpaid', label: 'Impaga', tone: 'neutral' as const },
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
