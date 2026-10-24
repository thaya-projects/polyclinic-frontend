import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLogPage, AuditLogQuery } from '../models/audit-log.model';

// GET /tenants/audit-log?from=&to=&entity=&page=&limit= — nunca manda
// tenant_id (prohibido en el ticket; sale del token del lado del backend).
@Injectable({ providedIn: 'root' })
export class AuditLogApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/audit-log`;

  getPage(query: AuditLogQuery): Observable<AuditLogPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.entity) params = params.set('entity', query.entity);
    return this.http.get<AuditLogPage>(this.base, { params });
  }
}
