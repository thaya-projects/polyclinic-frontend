import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { CreateOdontogramDto, Odontogram } from '../models/odontogram.model';

// Capa HTTP pura — sin estado. El tenant lo resuelve el backend desde el token: ningún body de acá
// lleva tenant_id (se arma campo a campo, whitelist).
//
// 403 (módulo odontogram apagado / sin ClinicalRead o ClinicalWrite), 404 (sin current es un estado
// normal de la pantalla), 409 y 422 los muestra la propia pantalla: sin el toast global genérico.
@Injectable({ providedIn: 'root' })
export class OdontogramApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants`;

  getCurrent(patientId: string): Observable<Odontogram> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<Odontogram>(`${this.base}/patients/${patientId}/odontogram/current`, { context });
  }

  getById(id: string): Observable<Odontogram> {
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404]);
    return this.http.get<Odontogram>(`${this.base}/odontograms/${id}`, { context });
  }

  // patient_id va en la ruta; is_current/snapshot_date los fija el backend. encounter_id y dentition
  // solo viajan si vienen (dentition ausente = permanente).
  create(patientId: string, dto: CreateOdontogramDto): Observable<Odontogram> {
    const body: Record<string, unknown> = { clinical_record_id: dto.clinical_record_id };
    if (dto.encounter_id) body['encounter_id'] = dto.encounter_id;
    if (dto.dentition !== undefined) body['dentition'] = dto.dentition;
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [403, 404, 409, 422]);
    return this.http.post<Odontogram>(`${this.base}/patients/${patientId}/odontograms`, body, { context });
  }
}
