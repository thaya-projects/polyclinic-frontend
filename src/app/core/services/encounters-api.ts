import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateEncounterDto, Encounter, EncounterSummary, EncountersQuery, SignEncounterDto, UpdateEncounterDto,
  VoidEncounterDto,
} from '../models/encounter.model';
import { PagedResult } from '../models/paged-result.model';

// Capa HTTP pura — sin estado. Tenant y signed_by/voided_by los resuelve el backend desde el
// token: ningún body de acá lleva tenant_id, signed_by ni voided_by.
@Injectable({ providedIn: 'root' })
export class EncountersApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/encounters`;

  // 403 (sin acceso a notas clínicas) lo muestra la propia pantalla: sin toast global duplicado.
  list(query: EncountersQuery): Observable<PagedResult<EncounterSummary>> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.patient_id) params = params.set('patient_id', query.patient_id);
    if (query.professional_id) params = params.set('professional_id', query.professional_id);
    if (query.status) params = params.set('status', query.status);
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403]);
    return this.http.get<PagedResult<EncounterSummary>>(this.base, { params, context });
  }

  // El 404 del detalle lo comunica el listado (aviso al volver) y el 403 la propia pantalla: sin
  // toast global duplicado.
  getById(id: string): Observable<Encounter> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<Encounter>(`${this.base}/${id}`, { context });
  }

  create(dto: CreateEncounterDto): Observable<Encounter> {
    return this.http.post<Encounter>(this.base, dto);
  }

  // Body armado campo a campo (whitelist): solo campos clínicos presentes + version.
  update(id: string, dto: UpdateEncounterDto): Observable<Encounter> {
    const body: Record<string, unknown> = { version: dto.version };
    for (const key of ['chief_complaint', 'anamnesis', 'exam', 'clinical_data'] as const) {
      if (dto[key] !== undefined) body[key] = dto[key];
    }
    return this.http.patch<Encounter>(`${this.base}/${id}`, body);
  }

  // Solo version: signed_by sale del token.
  sign(id: string, dto: SignEncounterDto): Observable<Encounter> {
    return this.http.post<Encounter>(`${this.base}/${id}/sign`, { version: dto.version });
  }

  // Solo reason + version: voided_by sale del token.
  void(id: string, dto: VoidEncounterDto): Observable<Encounter> {
    return this.http.post<Encounter>(`${this.base}/${id}/void`, { reason: dto.reason, version: dto.version });
  }
}
