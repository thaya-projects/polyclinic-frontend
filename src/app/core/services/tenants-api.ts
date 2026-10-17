import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RawTenantDetail, TenantDetail, EditTenantDto, toTenantDetail } from '../models/tenant-detail.model';
import { CreateTenantDto } from '../models/create-tenant.model';
import { PagedResponse, TenantListItem } from '../models/tenant-list-item.model';

// Respuesta real de POST .../suspend y .../activate (TenantStatusDTO en el backend) — mucho más
// liviana que TenantDetailDTO, solo { id, is_active }.
export interface TenantStatus {
  id: string;
  is_active: boolean;
}

// Capa HTTP pura — sin estado, sin caché. TenantsService es quien la
// consume y le agrega el signal/estado reactivo para la UI.
//
// GET /superadmin/tenants devuelve un PagedResult<TenantListItemDTO> real (envoltorio
// {items, total_count, ...}), nunca un array plano — antes esto se tipaba (mal) como
// TenantDetail[], lo que rompía el .map() de TenantsService en runtime y dejaba la lista
// siempre vacía. getById/create/update devuelven TenantDetailDTO ({tenant, subscription,
// first_users}), que acá se aplana a TenantDetail vía toTenantDetail para no reescribir cada
// componente que ya esperaba un objeto plano. suspend/activate devuelven algo mucho más chico
// (TenantStatusDTO), NO el detalle completo — quien los llama debe mergear ese resultado sobre
// el estado local existente, no reemplazarlo entero.
@Injectable({ providedIn: 'root' })
export class TenantsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/superadmin/tenants`;

  // limit=100: no hay paginación server-side implementada en la UI todavía (la tabla pagina en
  // memoria, PAGE_SIZE de TenantsPage) — pedimos una sola página grande en vez de armar un
  // mecanismo de paginación real por ahora.
  getAll(): Observable<TenantListItem[]> {
    return this.http
      .get<PagedResponse<TenantListItem>>(`${this.base}?limit=100`)
      .pipe(map(res => res.items));
  }

  getById(id: string): Observable<TenantDetail> {
    return this.http.get<RawTenantDetail>(`${this.base}/${id}`).pipe(map(toTenantDetail));
  }

  create(dto: CreateTenantDto): Observable<TenantDetail> {
    return this.http.post<RawTenantDetail>(this.base, dto).pipe(map(toTenantDetail));
  }

  update(id: string, dto: EditTenantDto): Observable<TenantDetail> {
    return this.http.patch<RawTenantDetail>(`${this.base}/${id}`, dto).pipe(map(toTenantDetail));
  }

  suspend(id: string): Observable<TenantStatus> {
    return this.http.post<TenantStatus>(`${this.base}/${id}/suspend`, {});
  }

  activate(id: string): Observable<TenantStatus> {
    return this.http.post<TenantStatus>(`${this.base}/${id}/activate`, {});
  }
}
