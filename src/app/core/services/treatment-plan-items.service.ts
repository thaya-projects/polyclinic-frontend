import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, map, switchMap, tap } from 'rxjs';
import { TreatmentPlanItemsApi } from './treatment-plan-items-api';
import { TreatmentPlansService } from './treatment-plans.service';
import {
  TreatmentPlanItem,
  TreatmentPlanItemDto,
  TreatmentPlanItemStatusChangeDto,
} from '../models/treatment-plan-item.model';
import { treatmentPlanItemsListErrorMessage } from '../../shared/utils/treatment-plan-items-error.util';

// Clase separada de TreatmentPlansService, igual que en el backend
// (TreatmentPlanItemService/Repository son clases propias). Depende de
// TreatmentPlansService a propósito: cada mutación de un item recalcula
// total_estimated del lado del backend, así que volvemos a pedir el
// detalle del plan después de cada una (criterio de aceptación de T5 —
// el total mostrado siempre es el del backend, nunca un cálculo local).
@Injectable({ providedIn: 'root' })
export class TreatmentPlanItemsService {
  private api = inject(TreatmentPlanItemsApi);
  private plansSvc = inject(TreatmentPlansService);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<TreatmentPlanItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/treatment-plans/:id/items
  loadForPlan(planId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getForPlan(planId).subscribe({
      next: items => {
        this.records.set(items);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(treatmentPlanItemsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/treatment-plans/:id/items
  create(planId: string, dto: TreatmentPlanItemDto): Observable<TreatmentPlanItem> {
    return this.api.create(planId, dto).pipe(
      tap(item => this.records.update(list => [...list, item])),
      switchMap(item => this.plansSvc.loadDetail(planId).pipe(map(() => item))),
    );
  }

  // DELETE /tenants/treatment-plans/:id/items/:itemId
  remove(planId: string, itemId: string): Observable<void> {
    return this.api.remove(planId, itemId).pipe(
      tap(() => this.records.update(list => list.filter(i => i.id !== itemId))),
      switchMap(() => this.plansSvc.loadDetail(planId).pipe(map(() => undefined))),
    );
  }

  // POST /tenants/treatment-plans/:id/items/:itemId/status — body
  // { status, appointment_id }. done_at/done_by los estampa el backend;
  // nunca se mandan desde acá.
  changeStatus(planId: string, itemId: string, dto: TreatmentPlanItemStatusChangeDto): Observable<TreatmentPlanItem> {
    return this.api.changeStatus(planId, itemId, dto).pipe(
      tap(item => this.upsertLocal(item)),
      switchMap(item => this.plansSvc.loadDetail(planId).pipe(map(() => item))),
    );
  }

  private upsertLocal(item: TreatmentPlanItem): void {
    this.records.update(list => {
      const exists = list.some(i => i.id === item.id);
      return exists ? list.map(i => (i.id === item.id ? item : i)) : [...list, item];
    });
  }
}
