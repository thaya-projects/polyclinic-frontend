import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { TenantDetail, EditTenantDto } from '../models/tenant-detail.model';
import { CreateTenantDto } from '../models/create-tenant.model';
import { TenantsApi } from './tenants-api';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private api = inject(TenantsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<TenantDetail[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  private toSummary(r: TenantDetail): Tenant {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      countryCode: r.country_code,
      plan: r.subscription.plan_id,
      status: r.subscription.status,
      isActive: r.is_active,
      createdAt: r.created_at,
    };
  }

  private readonly allSummaries = computed(() => this.records().map(r => this.toSummary(r)));

  getAll() {
    return this.allSummaries;
  }

  findDetail(id: string): TenantDetail | null {
    return this.records().find(r => r.id === id) ?? null;
  }

  // GET /superadmin/tenants — no se ejecuta en el servidor (SSR): este
  // panel es autenticado y depende del token del navegador.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: records => {
        this.records.set(records);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  // GET /superadmin/tenants/:id — se pide fresco (no del cache del listado)
  // para tener siempre el detalle completo.
  loadDetail(id: string): Observable<TenantDetail> {
    return this.api.getById(id).pipe(tap(detail => this.upsertLocal(detail)));
  }

  // POST /superadmin/tenants — el criterio de aceptación pide que el alta
  // recargue el listado completo (no solo insertar localmente).
  create(dto: CreateTenantDto): Observable<TenantDetail> {
    return this.api.create(dto).pipe(tap(() => this.load()));
  }

  // PATCH /superadmin/tenants/:id
  update(id: string, dto: EditTenantDto): Observable<TenantDetail> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  // POST /superadmin/tenants/:id/suspend | /activate — actualiza el
  // registro local con la respuesta para que el badge cambie al instante.
  setActive(id: string, isActive: boolean): Observable<TenantDetail> {
    const call$ = isActive ? this.api.activate(id) : this.api.suspend(id);
    return call$.pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(detail: TenantDetail): void {
    this.records.update(list => {
      const exists = list.some(r => r.id === detail.id);
      return exists ? list.map(r => (r.id === detail.id ? detail : r)) : [detail, ...list];
    });
  }
}
