import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import {
  CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto,
} from '../models/dental-condition.model';

// Capa HTTP pura — sin estado. El tenant lo resuelve el backend desde el token: ningún body de acá
// lleva tenant_id (se arma campo a campo, whitelist).
//
// 403 (módulo odontogram apagado / global no editable / sin organization.manage), 404, 409 y 422
// los muestra la propia pantalla con un texto específico: sin el toast global genérico duplicado.
@Injectable({ providedIn: 'root' })
export class DentalConditionsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/dental-conditions`;

  list(): Observable<DentalCondition[]> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403]);
    return this.http.get<DentalCondition[]>(this.base, { context });
  }

  create(dto: CreateDentalConditionDto): Observable<DentalCondition> {
    const body: Record<string, unknown> = { code: dto.code, name: dto.name };
    if (dto.category !== undefined) body['category'] = dto.category;
    if (dto.default_color !== undefined) body['default_color'] = dto.default_color;
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 409, 422]);
    return this.http.post<DentalCondition>(this.base, body, { context });
  }

  // PATCH tri-state: solo viajan las claves presentes (null = quitar category/default_color). Code inmutable.
  update(id: string, dto: UpdateDentalConditionDto): Observable<DentalCondition> {
    const body: Record<string, unknown> = {};
    for (const key of ['name', 'category', 'default_color'] as const) {
      if (dto[key] !== undefined) body[key] = dto[key];
    }
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 409, 422]);
    return this.http.patch<DentalCondition>(`${this.base}/${id}`, body, { context });
  }
}
