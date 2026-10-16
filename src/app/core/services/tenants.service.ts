import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { Tenant } from '../models/tenant.model';
import { TenantDetail, EditTenantDto } from '../models/tenant-detail.model';
import { TenantListItem } from '../models/tenant-list-item.model';
import { CreateTenantDto } from '../models/create-tenant.model';
import { TenantsApi, TenantStatus } from './tenants-api';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private api = inject(TenantsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<TenantListItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  private toSummary(r: TenantListItem): Tenant {
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      countryCode: r.country_code,
      plan: r.plan_name,
      status: r.subscription_status,
      isActive: r.is_active,
      createdAt: r.created_at,
    };
  }

  private readonly allSummaries = computed(() => this.records().map(r => this.toSummary(r)));

  getAll() {
    return this.allSummaries;
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
  // para tener siempre el detalle completo. TenantDetail (forma aplanada) no
  // es la misma forma que TenantListItem, así que no toca el cache de `records`.
  loadDetail(id: string): Observable<TenantDetail> {
    return this.api.getById(id);
  }

  // POST /superadmin/tenants — el criterio de aceptación pide que el alta
  // recargue el listado completo (no solo insertar localmente).
  create(dto: CreateTenantDto): Observable<TenantDetail> {
    return this.api.create(dto).pipe(tap(() => this.load()));
  }

  // PATCH /superadmin/tenants/:id
  update(id: string, dto: EditTenantDto): Observable<TenantDetail> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertListRow(id, updated)));
  }

  // POST /superadmin/tenants/:id/suspend | /activate — el backend devuelve solo
  // { id, is_active } (TenantStatusDTO), no el detalle completo. Actualiza únicamente ese campo
  // en la fila local de la lista.
  setActive(id: string, isActive: boolean): Observable<TenantStatus> {
    const call$ = isActive ? this.api.activate(id) : this.api.suspend(id);
    return call$.pipe(
      tap(status => {
        this.records.update(list => list.map(r => (r.id === status.id ? { ...r, is_active: status.is_active } : r)));
      }),
    );
  }

  // Refleja en la fila de `records` los campos de un TenantDetail recién editado — conserva
  // subscription_status/plan_name/users_count existentes (update no los toca ni los devuelve en
  // una forma compatible con la fila de la lista).
  private upsertListRow(id: string, detail: TenantDetail): void {
    this.records.update(list =>
      list.map(r =>
        r.id === id
          ? {
              ...r,
              name: detail.name,
              slug: detail.slug,
              country_code: detail.country_code,
              default_currency: detail.default_currency,
              is_active: detail.is_active,
            }
          : r,
      ),
    );
  }
}
