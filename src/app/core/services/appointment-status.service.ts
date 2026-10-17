import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, switchMap, tap } from 'rxjs';
import { AppointmentsApi } from './appointments-api';
import { AppointmentDetail, AppointmentStatusChangeDto } from '../models/appointment-status-history.model';
import { appointmentDetailErrorMessage } from '../../shared/utils/appointment-status-error.util';

@Injectable({ providedIn: 'root' })
export class AppointmentStatusService {
  private api = inject(AppointmentsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly detailSignal = signal<AppointmentDetail | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly detail = this.detailSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // GET /tenants/appointments/:id — trae el estado actual + el historial
  // embebido. No corre en SSR: depende del token del navegador.
  loadDetail(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getById(id).subscribe({
      next: detail => {
        this.detailSignal.set(detail);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(appointmentDetailErrorMessage(err));
      },
    });
  }

  // POST /tenants/appointments/:id/status — tras guardar, vuelve a pedir
  // el detalle (en vez de confiar en el shape de la respuesta del POST)
  // para que status, confirmed_at y el historial queden exactamente como
  // los dejó el backend (criterio de aceptación: "se actualiza sin
  // recargar toda la página" — esto es un re-fetch del detalle, no un
  // reload del navegador).
  changeStatus(id: string, dto: AppointmentStatusChangeDto): Observable<AppointmentDetail> {
    return this.api.changeStatus(id, dto).pipe(
      switchMap(() => this.api.getById(id)),
      tap(detail => this.detailSignal.set(detail)),
    );
  }
}
