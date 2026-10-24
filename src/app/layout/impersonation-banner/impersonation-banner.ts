import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../core/services/auth-store.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-impersonation-banner',
  templateUrl: './impersonation-banner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpersonationBanner {
  private store = inject(AuthStore);
  private session = inject(SessionService);

  readonly impersonatedBy = this.store.impersonatedBy;

  exit(): void {
    this.session.exitImpersonation();
  }
}
