import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InboundMessage, InboundMessagesQuery } from '../models/inbound-message.model';

// Capa HTTP pura — sin estado. InboundMessagesService la consume. Solo
// lectura (criterio de aceptación de T4, sigue valiendo acá). Ruta/params
// inferidos por convención (SCRUM-104).
@Injectable({ providedIn: 'root' })
export class InboundMessagesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/inbound-messages`;

  getAll(query: InboundMessagesQuery): Observable<InboundMessage[]> {
    let params = new HttpParams();
    if (query.patient_id) params = params.set('patient_id', query.patient_id);
    if (query.processed !== undefined) params = params.set('processed', String(query.processed));
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<InboundMessage[]>(this.base, { params });
  }
}
