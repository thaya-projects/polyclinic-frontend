import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppointmentsReportApi } from './appointments-report-api';
import { AppointmentsByStatusSummary, AppointmentsReportQuery } from '../models/clinic-report.model';
import { reportsErrorMessage } from '../../shared/utils/reports-error.util';

// GET /tenants/reports/appointments?from=&to=&professional_id=&status=
@Injectable({ providedIn: 'root' })
export class AppointmentsReportService {
  private api = inject(AppointmentsReportApi);
  private platformId = inject(PLATFORM_ID);

  private readonly summarySignal = signal<AppointmentsByStatusSummary[] | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly summary = this.summarySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(query: AppointmentsReportQuery): void {
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
        this.errorSignal.set(reportsErrorMessage(err, 'el reporte de citas'));
      },
    });
  }
}
