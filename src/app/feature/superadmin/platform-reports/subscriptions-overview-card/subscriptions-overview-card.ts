import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SubscriptionsReportService } from '../../../../core/services/subscriptions-report.service';
import { TenantStatus } from '../../../../core/models/tenant.model';
import { StatusChipTone } from '../../../../shared/components/status-chip/status-chip';

// Mismo mapeo que TenantsTable/SubscriptionStatusBadge — se duplica acá
// a propósito (igual criterio que esos dos: cada consumidor arma el suyo).
const STATUS_LABEL: Record<TenantStatus, string> = {
  trialing: 'Trial',
  active: 'Activa',
  past_due: 'Pago vencido',
  canceled: 'Cancelada',
  unpaid: 'Impaga',
};

const STATUS_TONE: Record<TenantStatus, StatusChipTone> = {
  trialing: 'wait',
  active: 'ok',
  past_due: 'neutral',
  canceled: 'neutral',
  unpaid: 'neutral',
};

const TONE_BORDER_CLASS: Record<StatusChipTone, string> = {
  ok: 'border-l-chip-ok-fg',
  wait: 'border-l-chip-wait-fg',
  danger: 'border-l-chip-danger-fg',
  neutral: 'border-l-border',
};

// Corresponde a GET /superadmin/reports/subscriptions.
@Component({
  selector: 'app-subscriptions-overview-card',
  imports: [],
  templateUrl: './subscriptions-overview-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionsOverviewCard {
  private reportSvc = inject(SubscriptionsReportService);

  readonly summary = this.reportSvc.summary;
  readonly loading = this.reportSvc.loading;
  readonly error = this.reportSvc.error;

  constructor() {
    this.reportSvc.load();
  }

  statusLabel(status: TenantStatus): string {
    return STATUS_LABEL[status];
  }

  borderClass(status: TenantStatus): string {
    return TONE_BORDER_CLASS[STATUS_TONE[status]];
  }
}
