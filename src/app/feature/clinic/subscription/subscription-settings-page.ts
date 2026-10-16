import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionsService } from '../../../core/services/subscriptions.service';
import { PageTitleService } from '../../../core/services/page-title.service';

// T10: pantalla de settings de clínica que consume GET /tenants/me/subscription. Sólo lectura —
// el ticket es explícito: "La clínica ve su plan y status. No cambia plan acá."
@Component({
  selector: 'app-subscription-settings-page',
  imports: [DatePipe],
  templateUrl: './subscription-settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSettingsPage {
  private subscriptionsSvc = inject(SubscriptionsService);

  readonly loading = this.subscriptionsSvc.loading;
  readonly error = this.subscriptionsSvc.error;
  readonly subscription = this.subscriptionsSvc.mine;

  constructor() {
    inject(PageTitleService).set('Mi suscripción');
    this.subscriptionsSvc.loadMine();
  }
}
