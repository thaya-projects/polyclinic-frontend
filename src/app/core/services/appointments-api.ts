import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Appointment, AppointmentDto, AppointmentsQuery } from '../models/appointment.model';
import { AppointmentDetail, AppointmentStatusChangeDto } from '../models/appointment-status-history.model';

// Capa HTTP pura — sin estado. AppointmentsService/AppointmentStatusService la consumen.
@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/appointments`;

  getAll(query: AppointmentsQuery): Observable<Appointment[]> {
    let params = new HttpParams().set('from', query.from).set('to', query.to);
    if (query.professional_id) params = params.set('professional_id', query.professional_id);
    if (query.branch_id) params = params.set('branch_id', query.branch_id);
    if (query.patient_id) params = params.set('patient_id', query.patient_id);
    if (query.status) params = params.set('status', query.status);
    return this.http.get<Appointment[]>(this.base, { params });
  }

  // T6 (cambio de estado): el detalle trae el historial embebido
  // (status_history) — es lo que usa AppointmentStatusService.
  getById(id: string): Observable<AppointmentDetail> {
    return this.http.get<AppointmentDetail>(`${this.base}/${id}`);
  }

  create(dto: AppointmentDto): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, dto);
  }

  update(id: string, dto: AppointmentDto): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.base}/${id}`, dto);
  }

  // POST /tenants/appointments/:id/status (T6)
  changeStatus(id: string, dto: AppointmentStatusChangeDto): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.base}/${id}/status`, dto);
  }
}
