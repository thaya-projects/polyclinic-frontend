import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { PlansApi } from './plans-api';
import { CreatePlanDto, Plan, UpdatePlanDto } from '../models/plan.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// El catálogo global tiene pocos planes (3 seedeados + los que el super admin agregue). Como
// tenants, cargamos toda la lista y filtramos/paginamos client-side — evita coordinar
// re-fetch en cada cambio de filtro y mantiene la UX instantánea. Si el catálogo crece
// mucho (>100), se migra a paginación server-side.
const CATALOG_LIMIT = 200;

@Injectable({ providedIn: 'root' })
export class PlansService {
  private api = inject(PlansApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Plan[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  find(id: string): Plan | null {
    return this.records().find(p => p.id === id) ?? null;
  }

  // Igual que TenantsService: no corre en SSR (panel autenticado, depende del token del browser).
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.list({ limit: CATALOG_LIMIT }).subscribe({
      next: page => {
        this.records.set(page.items);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  create(dto: CreatePlanDto): Observable<Plan> {
    return this.api.create(dto).pipe(tap(created => this.upsertLocal(created)));
  }

  update(id: string, dto: UpdatePlanDto): Observable<Plan> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  setActive(id: string, isActive: boolean): Observable<Plan> {
    return this.update(id, { is_active: isActive });
  }

  private upsertLocal(plan: Plan): void {
    this.records.update(list => {
      const exists = list.some(p => p.id === plan.id);
      return exists ? list.map(p => (p.id === plan.id ? plan : p)) : [plan, ...list];
    });
  }
}
