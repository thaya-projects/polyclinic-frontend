import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/paged-result.model';
import { CreateMeasurementDto, CreatedMeasurement, Measurement, MeasurementType, MeasurementsQuery } from '../models/measurement.model';
import type { MeasurementsRepository } from './measurements-repository';
import { toOffsetInstant } from '../../shared/utils/local-datetime.util';

// Campos que puede llevar el POST. Whitelist: aunque el caller cuele tenant_id, recorded_by u
// otros, no viajan (los resuelve el backend desde el token).
const CREATE_FIELDS = ['type', 'value', 'unit', 'measured_at', 'encounter_id', 'note'] as const;

// Fase 4 T4: capa HTTP pura de signos vitales — sin estado. Implementación por defecto de
// MEASUREMENTS_REPOSITORY.
//
// Toasts: las pantallas muestran sus propios mensajes en español (aviso de acceso, "Paciente no
// encontrado", errores inline del formulario), así que se suprime el toast genérico de
// httpErrorInterceptor donde sería un duplicado o mostraría el texto crudo del backend (422).
// El 401 lo resuelve authInterceptor (refresh o logout).
@Injectable({ providedIn: 'root' })
export class MeasurementsApi implements MeasurementsRepository {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants`;

  list(patientId: string, query: MeasurementsQuery): Observable<PagedResult<Measurement>> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.type) params = params.set('type', query.type);
    if (query.encounter_id) params = params.set('encounter_id', query.encounter_id);
    // from/to SIEMPRE con offset o Z (sin offset → 422). HttpParams codifica el "+" como %2B: sin
    // eso el servidor lo leería como un espacio.
    const from = query.from ? toOffsetInstant(query.from) : null;
    const to = query.to ? toOffsetInstant(query.to) : null;
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<PagedResult<Measurement>>(this.url(patientId), { params, context });
  }

  // 201 MeasurementDTO + encounter_version.
  create(patientId: string, dto: CreateMeasurementDto): Observable<CreatedMeasurement> {
    const body: Record<string, unknown> = {};
    for (const key of CREATE_FIELDS) {
      if (dto[key] !== undefined) body[key] = dto[key];
    }
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 409, 422]);
    return this.http.post<CreatedMeasurement>(this.url(patientId), body, { context });
  }

  listTypes(): Observable<MeasurementType[]> {
    return this.http.get<MeasurementType[]>(`${this.base}/measurement-types`);
  }

  private url(patientId: string): string {
    return `${this.base}/patients/${patientId}/measurements`;
  }
}
