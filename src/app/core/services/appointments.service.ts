import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { Appointment, AppointmentDto, AppointmentsQuery } from '../models/appointment.model';
import { AppointmentsApi } from './appointments-api';
import { appointmentsListErrorMessage } from '../../shared/utils/appointments-error.util';

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  private api = inject(AppointmentsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Appointment[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/appointments?from=&to=&professional_id=&branch_id=... —
  // no corre en SSR: depende del token del navegador. El listado
  // reemplaza el cache completo (acá no hay paginación, es un rango de
  // fechas acotado) para que los filtros reflejen exactamente lo que
  // devuelve el backend.
  load(query: AppointmentsQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: appointments => {
        this.records.set(appointments);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(appointmentsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/appointments
  create(dto: AppointmentDto): Observable<Appointment> {
    return this.api.create(dto).pipe(tap(created => this.records.update(list => [...list, created])));
  }

  // PATCH /tenants/appointments/:id
  update(id: string, dto: AppointmentDto): Observable<Appointment> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(appointment: Appointment): void {
    this.records.update(list => list.map(a => (a.id === appointment.id ? appointment : a)));
  }
}
