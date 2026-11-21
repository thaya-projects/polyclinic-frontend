import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TenantsOverviewCard } from '../../platform-reports/tenants-overview-card/tenants-overview-card';
import { SubscriptionsOverviewCard } from '../../platform-reports/subscriptions-overview-card/subscriptions-overview-card';
import { MrrCard } from '../../platform-reports/mrr-card/mrr-card';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { AuthStore } from '../../../../core/services/auth-store.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TenantsOverviewCard, SubscriptionsOverviewCard, MrrCard],
  templateUrl: './home-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private store = inject(AuthStore);

  readonly fullName = computed(() => this.store.user()?.full_name ?? '');

  constructor() {
    inject(PageTitleService).set('Inicio');
  }
}
