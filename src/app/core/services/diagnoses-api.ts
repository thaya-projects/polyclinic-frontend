import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { environment } from '../../../environments/environment';
import { CreateDiagnosisDto, CreatedDiagnosis, DeleteDiagnosisResult, Diagnosis } from '../models/diagnosis.model';

// Fase 4 T5: capa HTTP pura de diagnósticos — sin estado. Ningún body lleva tenant_id: el backend
// lo resuelve desde el token.
//
// Toasts: la sección de diagnósticos muestra sus propios mensajes en español (inline), así que se
// suprime el toast genérico de httpErrorInterceptor donde sería un duplicado (o mostraría el
// texto crudo del backend en inglés, caso del 422).
@Injectable({ providedIn: 'root' })
export class DiagnosesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/encounters`;

  // 403 y 404 → aviso en la propia sección.
  list(encounterId: string): Observable<Diagnosis[]> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<Diagnosis[]>(this.url(encounterId), { context });
  }

  // 201 DiagnosisDTO + encounter_version. Body armado campo a campo (whitelist): aunque el caller
  // cuele tenant_id u otros, no viajan.
  create(encounterId: string, dto: CreateDiagnosisDto): Observable<CreatedDiagnosis> {
    const body: Record<string, unknown> = {};
    for (const key of ['cie10_code', 'description', 'is_definitive'] as const) {
      if (dto[key] !== undefined) body[key] = dto[key];
    }
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 422]);
    return this.http.post<CreatedDiagnosis>(this.url(encounterId), body, { context });
  }

  // 200 { encounter_version }.
  delete(encounterId: string, diagnosisId: string): Observable<DeleteDiagnosisResult> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 422]);
    return this.http.delete<DeleteDiagnosisResult>(`${this.url(encounterId)}/${diagnosisId}`, { context });
  }

  private url(encounterId: string): string {
    return `${this.base}/${encounterId}/diagnoses`;
  }
}
