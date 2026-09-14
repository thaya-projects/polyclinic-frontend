import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantDetail, EditTenantDto } from '../models/tenant-detail.model';
import { CreateTenantDto } from '../models/create-tenant.model';

// Capa HTTP pura — sin estado, sin caché. TenantsService es quien la
// consume y le agrega el signal/estado reactivo para la UI.
@Injectable({ providedIn: 'root' })
export class TenantsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/superadmin/tenants`;

  getAll(): Observable<TenantDetail[]> {
    return this.http.get<TenantDetail[]>(this.base);
  }

  getById(id: string): Observable<TenantDetail> {
    return this.http.get<TenantDetail>(`${this.base}/${id}`);
  }

  create(dto: CreateTenantDto): Observable<TenantDetail> {
    return this.http.post<TenantDetail>(this.base, dto);
  }

  update(id: string, dto: EditTenantDto): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`${this.base}/${id}`, dto);
  }

  suspend(id: string): Observable<TenantDetail> {
    return this.http.post<TenantDetail>(`${this.base}/${id}/suspend`, {});
  }

  activate(id: string): Observable<TenantDetail> {
    return this.http.post<TenantDetail>(`${this.base}/${id}/activate`, {});
  }
}
