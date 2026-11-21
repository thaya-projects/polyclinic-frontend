import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMaterialDto, Material, MaterialsQuery, UpdateMaterialDto } from '../models/material.model';
import { PagedResult } from '../models/paged-result.model';

// Capa HTTP pura — sin estado. MaterialsService la consume.
@Injectable({ providedIn: 'root' })
export class MaterialsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/materials`;

  getAll(query: MaterialsQuery): Observable<PagedResult<Material>> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.is_active !== undefined) params = params.set('is_active', String(query.is_active));
    if (query.category) params = params.set('category', query.category);
    return this.http.get<PagedResult<Material>>(this.base, { params });
  }

  create(dto: CreateMaterialDto): Observable<Material> {
    return this.http.post<Material>(this.base, dto);
  }

  update(id: string, dto: UpdateMaterialDto): Observable<Material> {
    return this.http.patch<Material>(`${this.base}/${id}`, dto);
  }
}
