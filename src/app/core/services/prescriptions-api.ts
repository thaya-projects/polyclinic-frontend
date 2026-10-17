import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/paged-result.model';
import {
  CreatePrescriptionDto, CreatePrescriptionItemDto, CreatedPrescription, CreatedPrescriptionItem, Prescription,
  PrescriptionsQuery,
} from '../models/prescription.model';
import type { PrescriptionsRepository } from './prescriptions-repository';

// Whitelists de los bodies: aunque el caller cuele tenant_id, professional_id, patient_id,
// issued_at u otros, no viajan (salen de la URL y del token en el backend).
const ITEM_FIELDS = ['medication', 'presentation', 'dose', 'frequency', 'duration', 'instructions'] as const;

export function prescriptionItemBody(dto: CreatePrescriptionItemDto): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of ITEM_FIELDS) {
    if (dto?.[key] !== undefined) body[key] = dto[key];
  }
  return body;
}

export function prescriptionBody(dto: CreatePrescriptionDto): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (dto?.notes !== undefined) body['notes'] = dto.notes;
  if (dto?.items !== undefined) body['items'] = dto.items.map(prescriptionItemBody);
  return body;
}

const READ_SKIP = [403, 404];
const WRITE_SKIP = [403, 404, 409, 422];

// Fase 4 Recetas T5: capa HTTP pura — sin estado. Implementación por defecto de
// PRESCRIPTIONS_REPOSITORY.
//
// Toasts: las pantallas muestran sus propios mensajes en español (aviso de acceso, "Paciente no
// encontrado", errores inline), así que se suprime el toast genérico de httpErrorInterceptor donde
// sería un duplicado o mostraría el texto crudo del backend. El 401 lo resuelve authInterceptor.
@Injectable({ providedIn: 'root' })
export class PrescriptionsApi implements PrescriptionsRepository {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants`;

  listByEncounter(encounterId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.base}/encounters/${encounterId}/prescriptions`, {
      context: skip(READ_SKIP),
    });
  }

  listByPatient(patientId: string, query: PrescriptionsQuery): Observable<PagedResult<Prescription>> {
    const params = new HttpParams().set('page', query.page).set('limit', query.limit);
    return this.http.get<PagedResult<Prescription>>(`${this.base}/patients/${patientId}/prescriptions`, {
      params, context: skip(READ_SKIP),
    });
  }

  createForEncounter(encounterId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription> {
    return this.http.post<CreatedPrescription>(`${this.base}/encounters/${encounterId}/prescriptions`,
      prescriptionBody(dto), { context: skip(WRITE_SKIP) });
  }

  createStandalone(patientId: string, dto: CreatePrescriptionDto): Observable<CreatedPrescription> {
    return this.http.post<CreatedPrescription>(`${this.base}/patients/${patientId}/prescriptions`,
      prescriptionBody(dto), { context: skip(WRITE_SKIP) });
  }

  addItem(prescriptionId: string, dto: CreatePrescriptionItemDto): Observable<CreatedPrescriptionItem> {
    return this.http.post<CreatedPrescriptionItem>(`${this.base}/prescriptions/${prescriptionId}/items`,
      prescriptionItemBody(dto), { context: skip(WRITE_SKIP) });
  }
}

function skip(statuses: number[]): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, statuses);
}
