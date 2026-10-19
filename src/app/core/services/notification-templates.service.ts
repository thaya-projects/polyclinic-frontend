import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { NotificationTemplatesApi } from './notification-templates-api';
import { NotificationTemplate, NotificationTemplateDto } from '../models/notification-template.model';
import { notificationTemplatesListErrorMessage } from '../../shared/utils/notification-templates-error.util';

@Injectable({ providedIn: 'root' })
export class NotificationTemplatesService {
  private api = inject(NotificationTemplatesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<NotificationTemplate[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): NotificationTemplate | null {
    return this.records().find(t => t.id === id) ?? null;
  }

  // GET /tenants/notification-templates — trae globales + propias de la
  // clínica (criterio de T1), no corre en SSR.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: templates => {
        this.records.set(templates);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(notificationTemplatesListErrorMessage(err));
      },
    });
  }

  // POST /tenants/notification-templates — siempre crea una plantilla de
  // la propia clínica (tenant_id lo pone el backend desde el token,
  // nunca se manda en el body).
  create(dto: NotificationTemplateDto): Observable<NotificationTemplate> {
    return this.api.create(dto).pipe(tap(template => this.records.update(list => [template, ...list])));
  }

  // PATCH /tenants/notification-templates/:id — el contenedor ya evita
  // llamarlo para una plantilla global.
  update(id: string, dto: NotificationTemplateDto): Observable<NotificationTemplate> {
    return this.api.update(id, dto).pipe(tap(template => this.upsertLocal(template)));
  }

  private upsertLocal(template: NotificationTemplate): void {
    this.records.update(list => list.map(t => (t.id === template.id ? template : t)));
  }
}
