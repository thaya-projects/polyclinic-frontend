import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateScheduleExceptionDto, ReplaceScheduleDto, ScheduleBlock, ScheduleException,
} from '../models/schedule.model';

@Injectable({ providedIn: 'root' })
export class SchedulesApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getScheduleFor(professionalId: string): Observable<ScheduleBlock[]> {
    return this.http.get<ScheduleBlock[]>(
      `${this.base}/tenants/professionals/${professionalId}/schedule`);
  }

  replaceSchedule(professionalId: string, dto: ReplaceScheduleDto): Observable<ScheduleBlock[]> {
    return this.http.put<ScheduleBlock[]>(
      `${this.base}/tenants/professionals/${professionalId}/schedule`, dto);
  }

  listExceptions(professionalId?: string, branchId?: string): Observable<ScheduleException[]> {
    let params = new HttpParams();
    if (professionalId) params = params.set('professional_id', professionalId);
    if (branchId) params = params.set('branch_id', branchId);
    return this.http.get<ScheduleException[]>(
      `${this.base}/tenants/schedule-exceptions`, { params });
  }

  createException(dto: CreateScheduleExceptionDto): Observable<ScheduleException> {
    return this.http.post<ScheduleException>(
      `${this.base}/tenants/schedule-exceptions`, dto);
  }

  deleteException(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tenants/schedule-exceptions/${id}`);
  }
}
