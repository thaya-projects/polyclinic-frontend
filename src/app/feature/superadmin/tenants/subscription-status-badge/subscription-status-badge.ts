import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StatusChip, StatusChipTone } from '../../../../shared/components/status-chip/status-chip';
import { TenantStatus } from '../../../../core/models/tenant.model';

// Refleja Domain.Enums.SubscriptionStatus (backend) — mismo mapeo que tenants-table.ts.
const LABEL: Record<TenantStatus, string> = {
  trialing: 'Trial',
  active: 'Activa',
  past_due: 'Pago vencido',
  canceled: 'Cancelada',
  unpaid: 'Impaga',
};

const TONE: Record<TenantStatus, StatusChipTone> = {
  trialing: 'wait',
  active: 'ok',
  past_due: 'neutral',
  canceled: 'neutral',
  unpaid: 'neutral',
};

@Component({
  selector: 'app-subscription-status-badge',
  imports: [StatusChip],
  templateUrl: './subscription-status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionStatusBadge {
  // null: el tenant no tiene ninguna subscription todavía (puede pasar, ej. tenants creados
  // antes de que existiera el módulo de subscripciones).
  status = input.required<TenantStatus | null>();

  label = computed(() => {
    const s = this.status();
    return s ? LABEL[s] : 'Sin subscripción';
  });

  tone = computed<StatusChipTone>(() => {
    const s = this.status();
    return s ? TONE[s] : 'neutral';
  });
}
