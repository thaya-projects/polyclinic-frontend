import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NotificationsApi } from './notifications-api';
import { Notification, NotificationsQuery } from '../models/notification.model';
import { notificationsListErrorMessage } from '../../shared/utils/notifications-error.util';

// Solo lectura (criterio de aceptación: "notificaciones salientes...
// listados de solo lectura") — sin create()/update(), el backend es
// quien genera estas filas (worker + reglas), nunca esta UI.
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(NotificationsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Notification[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  load(query: NotificationsQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: notifications => {
        this.records.set(notifications);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(notificationsListErrorMessage(err));
      },
    });
  }
}
