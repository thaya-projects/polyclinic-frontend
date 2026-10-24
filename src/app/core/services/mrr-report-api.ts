import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MrrReportSummary } from '../models/platform-report.model';

// GET /superadmin/reports/mrr — sin filtros.
@Injectable({ providedIn: 'root' })
export class MrrReportApi {
  private http = inject(HttpClient);

  getSummary(): Observable<MrrReportSummary> {
    return this.http.get<MrrReportSummary>(`${environment.apiUrl}/superadmin/reports/mrr`);
  }
}
