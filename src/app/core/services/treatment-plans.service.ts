import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, switchMap, tap } from 'rxjs';
import { TreatmentPlansApi } from './treatment-plans-api';
import { TreatmentPlan, TreatmentPlanDto, TreatmentPlanStatusChangeDto } from '../models/treatment-plan.model';
import { treatmentPlansListErrorMessage } from '../../shared/utils/treatment-plans-error.util';

@Injectable({ providedIn: 'root' })
export class TreatmentPlansService {
  private api = inject(TreatmentPlansApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<TreatmentPlan[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): TreatmentPlan | null {
    return this.records().find(p => p.id === id) ?? null;
  }

  // GET /tenants/patients/:patientId/treatment-plans — no corre en SSR:
  // depende del token del navegador. Reemplaza el cache completo (ya
  // viene scopeado al paciente desde el backend).
  loadForPatient(patientId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getForPatient(patientId).subscribe({
      next: plans => {
        this.records.set(plans);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(treatmentPlansListErrorMessage(err));
      },
    });
  }

  // POST /tenants/patients/:patientId/treatment-plans — nunca manda
  // total_estimated (lo calcula el backend) ni tenant_id (sale del token).
  create(patientId: string, dto: TreatmentPlanDto): Observable<TreatmentPlan> {
    return this.api.create(patientId, dto).pipe(tap(plan => this.records.update(list => [plan, ...list])));
  }

  // GET /tenants/treatment-plans/:id — refresca el detalle con lo último
  // del backend (ej. al abrir el modal de detalle).
  loadDetail(id: string): Observable<TreatmentPlan> {
    return this.api.getById(id).pipe(tap(plan => this.upsertLocal(plan)));
  }

  // PATCH /tenants/treatment-plans/:id
  update(id: string, dto: TreatmentPlanDto): Observable<TreatmentPlan> {
    return this.api.update(id, dto).pipe(tap(plan => this.upsertLocal(plan)));
  }

  private upsertLocal(plan: TreatmentPlan): void {
    this.records.update(list => {
      const exists = list.some(p => p.id === plan.id);
      return exists ? list.map(p => (p.id === plan.id ? plan : p)) : [plan, ...list];
    });
  }

  // POST /tenants/treatment-plans/:id/status — tras guardar, vuelve a
  // pedir el detalle (en vez de confiar en el shape de la respuesta del
  // POST) para que total_estimated quede exactamente como lo dejó el
  // backend (mismo criterio que AppointmentStatusService.changeStatus).
  changeStatus(id: string, dto: TreatmentPlanStatusChangeDto): Observable<TreatmentPlan> {
    return this.api.changeStatus(id, dto).pipe(
      switchMap(() => this.api.getById(id)),
      tap(plan => this.upsertLocal(plan)),
    );
  }
}
