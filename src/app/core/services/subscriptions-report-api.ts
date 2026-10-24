import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubscriptionsReportSummary } from '../models/platform-report.model';

// GET /superadmin/reports/subscriptions — sin filtros.
@Injectable({ providedIn: 'root' })
export class SubscriptionsReportApi {
  private http = inject(HttpClient);

  getSummary(): Observable<SubscriptionsReportSummary> {
    return this.http.get<SubscriptionsReportSummary>(`${environment.apiUrl}/superadmin/reports/subscriptions`);
  }
}
