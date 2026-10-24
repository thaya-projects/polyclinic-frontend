import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PatientsReportApi } from './patients-report-api';
import { PatientsReportQuery } from '../models/clinic-report.model';
import { reportsErrorMessage } from '../../shared/utils/reports-error.util';

// GET /tenants/reports/patients?from=&to=
@Injectable({ providedIn: 'root' })
export class PatientsReportService {
  private api = inject(PatientsReportApi);
  private platformId = inject(PLATFORM_ID);

  private readonly summarySignal = signal<number | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly summary = this.summarySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(query: PatientsReportQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getSummary(query).subscribe({
      next: response => {
        this.summarySignal.set(response.new_patients_count);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(reportsErrorMessage(err, 'el reporte de pacientes'));
      },
    });
  }
}
