import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuditLogApi } from './audit-log-api';
import { AuditLogPage, AuditLogQuery } from '../models/audit-log.model';
import { reportsErrorMessage } from '../../shared/utils/reports-error.util';

// GET /tenants/audit-log?from=&to=&entity=&page=&limit= — nunca manda
// tenant_id (prohibido en el ticket).
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private api = inject(AuditLogApi);
  private platformId = inject(PLATFORM_ID);

  private readonly pageSignal = signal<AuditLogPage | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly page = this.pageSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(query: AuditLogQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getPage(query).subscribe({
      next: page => {
        this.pageSignal.set(page);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(reportsErrorMessage(err, 'la auditoría'));
      },
    });
  }
}
