import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { ClinicRole, RoleDto } from '../models/clinic-role.model';
import { RolesApi } from './roles-api';
import { rolesListErrorMessage } from '../../shared/utils/roles-error.util';

@Injectable({ providedIn: 'root' })
export class ClinicRolesService {
  private api = inject(RolesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<ClinicRole[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/roles — no corre en SSR: depende del token del navegador.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: roles => {
        this.records.set(roles);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(rolesListErrorMessage(err));
      },
    });
  }

  // POST /tenants/roles — recarga el listado completo, igual que TenantsService.create().
  create(dto: RoleDto): Observable<ClinicRole> {
    return this.api.create(dto).pipe(tap(() => this.load()));
  }

  // PATCH /tenants/roles/:id
  update(id: string, dto: RoleDto): Observable<ClinicRole> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  // DELETE /tenants/roles/:id — puede devolver 409 si hay user_role
  // asociados; el error se propaga tal cual para que la UI lo muestre.
  delete(id: string): Observable<void> {
    return this.api.delete(id).pipe(tap(() => this.records.update(list => list.filter(r => r.id !== id))));
  }

  private upsertLocal(role: ClinicRole): void {
    this.records.update(list => list.map(r => (r.id === role.id ? role : r)));
  }
}
