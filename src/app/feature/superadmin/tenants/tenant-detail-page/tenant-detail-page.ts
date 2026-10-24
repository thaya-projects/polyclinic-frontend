import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SubscriptionStatusBadge } from '../subscription-status-badge/subscription-status-badge';
import { StatusChip } from '../../../../shared/components/status-chip/status-chip';
import { TenantDetail } from '../../../../core/models/tenant-detail.model';
import { countryLabel } from '../../../../core/constants/countries.const';

@Component({
  selector: 'app-tenant-detail-page',
  imports: [SubscriptionStatusBadge, StatusChip],
  templateUrl: './tenant-detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantDetailPage {
  tenant = input.required<TenantDetail>();

  countryName = computed(() => countryLabel(this.tenant().country_code));

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
