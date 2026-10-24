import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SubscriptionsService } from '../../../../core/services/subscriptions.service';
import { PlansService } from '../../../../core/services/plans.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { ConfirmDialog, ConfirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { httpErrorMessage } from '../../../../shared/utils/http-error.util';

// T8: panel super admin de subscription del tenant. Lee el tenantId desde el path, carga la
// subscription y muestra plan/status/trial + botones cambiar plan / extender trial / cancelar.
@Component({
  selector: 'app-subscription-admin-page',
  imports: [FormsModule, RouterLink, DatePipe, ConfirmDialog],
  templateUrl: './subscription-admin-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionAdminPage {
  private route = inject(ActivatedRoute);
  private subscriptionsSvc = inject(SubscriptionsService);
  private plansSvc = inject(PlansService);

  readonly loading = this.subscriptionsSvc.loading;
  readonly loadError = this.subscriptionsSvc.error;
  readonly plans = this.plansSvc.getAll();

  // tenantId sale del path — como es un router param, lo derivamos del ActivatedRoute signal.
  readonly tenantId = toSignal(
    this.route.paramMap.pipe(map(pm => pm.get('id') ?? '')),
    { initialValue: '' });

  readonly subscription = computed(() => this.subscriptionsSvc.get(this.tenantId()));

  private platformId = inject(PLATFORM_ID);

  selectedPlanId = signal('');
  extendDays = signal(7);
  cancelAtPeriodEnd = signal(false);
  actionError = signal<string | null>(null);
  actionInFlight = signal(false);

  // Confirmaciones separadas para no confundirlas.
  confirmingCancel = signal(false);

  readonly cancelTone: ConfirmTone = 'danger';

  constructor() {
    inject(PageTitleService).set('Suscripción del tenant');
    this.plansSvc.load();
    // Cargamos la sub cada vez que cambia el tenantId.
    this.route.paramMap.subscribe(pm => {
      const id = pm.get('id');
      if (id) this.subscriptionsSvc.loadByTenant(id);
    });
  }

  planName(id: string): string {
    return this.plans().find(p => p.id === id)?.name ?? id;
  }

  onChangePlan(): void {
    const id = this.tenantId();
    const planId = this.selectedPlanId();
    if (!id || !planId) return;
    this.runAction(this.subscriptionsSvc.changePlan(id, planId));
  }

  onExtendTrial(): void {
    const id = this.tenantId();
    const days = Number(this.extendDays());
    if (!id || !Number.isFinite(days) || days <= 0) return;
    this.runAction(this.subscriptionsSvc.extendTrial(id, days));
  }

  requestCancel(): void {
    this.actionError.set(null);
    this.confirmingCancel.set(true);
  }

  confirmCancel(): void {
    const id = this.tenantId();
    if (!id) return;
    this.confirmingCancel.set(false);
    this.runAction(this.subscriptionsSvc.cancel(id, this.cancelAtPeriodEnd()));
  }

  // T4: dispara /checkout, si el backend devuelve URL redirige a Stripe hosted. En SSR skippea
  // window.location — el checkout es siempre browser-triggered.
  onCreateCheckout(): void {
    const id = this.tenantId();
    if (!id) return;
    this.actionInFlight.set(true);
    this.actionError.set(null);
    this.subscriptionsSvc.createCheckout(id).subscribe({
      next: session => {
        this.actionInFlight.set(false);
        if (isPlatformBrowser(this.platformId)) window.location.href = session.checkout_url;
      },
      error: err => {
        this.actionInFlight.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  cancelCancel(): void {
    if (this.actionInFlight()) return;
    this.confirmingCancel.set(false);
  }

  private runAction(obs: ReturnType<SubscriptionsService['changePlan']>): void {
    this.actionInFlight.set(true);
    this.actionError.set(null);
    obs.subscribe({
      next: () => this.actionInFlight.set(false),
      error: err => {
        this.actionInFlight.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }
}
