import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TenantsOverviewCard } from '../tenants-overview-card/tenants-overview-card';
import { SubscriptionsOverviewCard } from '../subscriptions-overview-card/subscriptions-overview-card';
import { MrrCard } from '../mrr-card/mrr-card';
import { PageTitleService } from '../../../../core/services/page-title.service';

// Protegida por superadminGuard a nivel de ruta (app.routes.ts) y oculta
// del sidebar para cualquier usuario que no sea super admin (criterio de
// aceptación: "la ruta se oculta y se protege").
@Component({
  selector: 'app-platform-reports-page',
  imports: [TenantsOverviewCard, SubscriptionsOverviewCard, MrrCard],
  templateUrl: './platform-reports-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformReportsPage {
  constructor() {
    inject(PageTitleService).set('Reportes de plataforma');
  }
}
