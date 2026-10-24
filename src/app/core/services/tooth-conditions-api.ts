import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import {
  CreateToothConditionDto, ToothCondition, UpdateToothConditionDto,
} from '../models/tooth-condition.model';

// Capa HTTP pura — sin estado. Sub-recurso del odontograma (ToothConditionController):
//   GET    /tenants/odontograms/{id}/teeth
//   POST   /tenants/odontograms/{id}/teeth
//   PATCH  /tenants/odontograms/{id}/teeth/{toothConditionId}
//   DELETE /tenants/odontograms/{id}/teeth/{toothConditionId}   → 204
// Los bodies se arman campo a campo (whitelist): nunca viajan tenant_id (token), odontogram_id (ruta)
// ni created_by / created_at (los fija el backend).
//
// 403 (módulo apagado / sin ClinicalRead o ClinicalWrite), 404, 409 (odontograma histórico) y 422 los
// muestra el panel de la pieza: sin el toast global genérico duplicado.
@Injectable({ providedIn: 'root' })
export class ToothConditionsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/odontograms`;

  list(odontogramId: string): Observable<ToothCondition[]> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<ToothCondition[]>(this.url(odontogramId), { context });
  }

  // surface / state / note solo si vienen (ausentes = whole / existente / sin nota en el backend).
  create(odontogramId: string, dto: CreateToothConditionDto): Observable<ToothCondition> {
    const body: Record<string, unknown> = { tooth_fdi: dto.tooth_fdi, condition_id: dto.condition_id };
    if (dto.surface !== undefined) body['surface'] = dto.surface;
    if (dto.state !== undefined) body['state'] = dto.state;
    if (dto.note !== undefined && dto.note !== null) body['note'] = dto.note;
    return this.http.post<ToothCondition>(this.url(odontogramId), body, { context: writeContext() });
  }

  // PATCH tri-state: solo viajan las claves presentes (las que cambiaron); note null = quitar la nota.
  update(odontogramId: string, toothConditionId: string, dto: UpdateToothConditionDto): Observable<ToothCondition> {
    const body: Record<string, unknown> = {};
    for (const key of ['condition_id', 'surface', 'state', 'note'] as const) {
      if (dto[key] !== undefined) body[key] = dto[key];
    }
    return this.http.patch<ToothCondition>(`${this.url(odontogramId)}/${toothConditionId}`, body, {
      context: writeContext(),
    });
  }

  remove(odontogramId: string, toothConditionId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(odontogramId)}/${toothConditionId}`, { context: writeContext() });
  }

  private url(odontogramId: string): string {
    return `${this.base}/${odontogramId}/teeth`;
  }
}

function writeContext(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 409, 422]);
}
