import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { TenantStatus } from '../../../../core/models/tenant.model';

const LABEL: Record<TenantStatus, string> = {
  active: 'Activa',
  trial: 'Trial',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};

const TONE: Record<TenantStatus, StatusChipTone> = {
  active: 'ok',
  trial: 'wait',
  suspended: 'neutral',
  cancelled: 'neutral',
};

@Component({
  selector: 'app-subscription-status-badge',
  imports: [StatusChip],
  templateUrl: './subscription-status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionStatusBadge {
  status = input.required<TenantStatus>();

  label = computed(() => LABEL[this.status()]);
  tone = computed(() => TONE[this.status()]);
}
