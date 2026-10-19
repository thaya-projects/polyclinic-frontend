import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReminderRule, ReminderRuleDto } from '../models/reminder-rule.model';

// Capa HTTP pura — sin estado. ReminderRulesService la consume.
// Ruta inferida por convención — el schema no trae Endpoints literales
// (SCRUM-17).
@Injectable({ providedIn: 'root' })
export class ReminderRulesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/reminder-rules`;

  getAll(): Observable<ReminderRule[]> {
    return this.http.get<ReminderRule[]>(this.base);
  }

  create(dto: ReminderRuleDto): Observable<ReminderRule> {
    return this.http.post<ReminderRule>(this.base, dto);
  }

  update(id: string, dto: ReminderRuleDto): Observable<ReminderRule> {
    return this.http.patch<ReminderRule>(`${this.base}/${id}`, dto);
  }
}
