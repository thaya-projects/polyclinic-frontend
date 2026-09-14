import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastTone } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [],
  templateUrl: './toast-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  private toastSvc = inject(ToastService);

  readonly toasts = this.toastSvc.toasts;

  dismiss(id: number): void {
    this.toastSvc.dismiss(id);
  }

  toneClass(tone: ToastTone): string {
    switch (tone) {
      case 'error':
        return 'bg-chip-danger-bg text-chip-danger-fg';
      case 'success':
        return 'bg-chip-ok-bg text-chip-ok-fg';
      default:
        return 'bg-icon-soft text-fg';
    }
  }

  toneIcon(tone: ToastTone): string {
    switch (tone) {
      case 'error':
        return 'ti-alert-circle';
      case 'success':
        return 'ti-circle-check';
      default:
        return 'ti-info-circle';
    }
  }
}
