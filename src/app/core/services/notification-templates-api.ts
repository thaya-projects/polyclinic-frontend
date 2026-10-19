import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationTemplate, NotificationTemplateDto } from '../models/notification-template.model';

// Capa HTTP pura — sin estado. NotificationTemplatesService la consume.
// Ruta inferida por convención (/tenants/<recurso>) — el schema de esta
// fase no trae una sección de Endpoints literal (SCRUM-13).
@Injectable({ providedIn: 'root' })
export class NotificationTemplatesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/notification-templates`;

  getAll(): Observable<NotificationTemplate[]> {
    return this.http.get<NotificationTemplate[]>(this.base);
  }

  create(dto: NotificationTemplateDto): Observable<NotificationTemplate> {
    return this.http.post<NotificationTemplate>(this.base, dto);
  }

  update(id: string, dto: NotificationTemplateDto): Observable<NotificationTemplate> {
    return this.http.patch<NotificationTemplate>(`${this.base}/${id}`, dto);
  }
}
