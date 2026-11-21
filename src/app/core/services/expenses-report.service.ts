import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ExpensesReportApi } from './expenses-report-api';
import { ExpensesReport, ExpensesReportQuery } from '../models/financial-report.model';
import { reportsErrorMessage } from '../../shared/utils/reports-error.util';

// GET /tenants/reports/expenses?from=&to=
@Injectable({ providedIn: 'root' })
export class ExpensesReportService {
  private api = inject(ExpensesReportApi);
  private platformId = inject(PLATFORM_ID);

  private readonly summarySignal = signal<ExpensesReport | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly summary = this.summarySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(query: ExpensesReportQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getSummary(query).subscribe({
      next: summary => {
        this.summarySignal.set(summary);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(reportsErrorMessage(err, 'el reporte de gastos'));
      },
    });
  }
}
