import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MrrReportApi } from './mrr-report-api';
import { MrrReportSummary } from '../models/platform-report.model';
import { reportsErrorMessage } from '../../shared/utils/reports-error.util';

// GET /superadmin/reports/mrr
@Injectable({ providedIn: 'root' })
export class MrrReportService {
  private api = inject(MrrReportApi);
  private platformId = inject(PLATFORM_ID);

  private readonly summarySignal = signal<MrrReportSummary | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly summary = this.summarySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getSummary().subscribe({
      next: summary => {
        this.summarySignal.set(summary);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(reportsErrorMessage(err, 'el MRR'));
      },
    });
  }
}
