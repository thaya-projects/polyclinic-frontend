import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, NotificationsQuery } from '../models/notification.model';

// Capa HTTP pura — sin estado. NotificationsService la consume. Solo
// lectura (criterio de aceptación: "notificaciones salientes... listados
// de solo lectura"). Ruta/params inferidos por convención (SCRUM-103).
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/notifications`;

  getAll(query: NotificationsQuery): Observable<Notification[]> {
    let params = new HttpParams();
    if (query.patient_id) params = params.set('patient_id', query.patient_id);
    if (query.status) params = params.set('status', query.status);
    if (query.channel) params = params.set('channel', query.channel);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<Notification[]>(this.base, { params });
  }
}
