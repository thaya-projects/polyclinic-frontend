import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../../core/services/auth-store.service';

@Component({
  selector: 'app-session-loading-overlay',
  imports: [],
  templateUrl: './session-loading-overlay.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionLoadingOverlay {
  private store = inject(AuthStore);

  readonly verifying = this.store.verifying;
}
