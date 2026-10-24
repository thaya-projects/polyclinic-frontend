import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePatientDto, Patient, PatientsPageResult, PatientsQuery } from '../models/patient.model';

// Capa HTTP pura — sin estado. PatientsService la consume y le agrega el
// signal/estado reactivo para la UI.
@Injectable({ providedIn: 'root' })
export class PatientsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/patients`;

  getAll(query: PatientsQuery): Observable<PatientsPageResult> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.q) params = params.set('q', query.q);
    if (query.document) params = params.set('document', query.document);
    return this.http.get<PatientsPageResult>(this.base, { params });
  }

  // GET /tenants/patients/:id (404 si no existe o es de otro tenant).
  getById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/${id}`);
  }

  create(dto: CreatePatientDto): Observable<Patient> {
    return this.http.post<Patient>(this.base, dto);
  }

  update(id: string, dto: CreatePatientDto): Observable<Patient> {
    return this.http.patch<Patient>(`${this.base}/${id}`, dto);
  }

  deactivate(id: string): Observable<Patient> {
    return this.http.post<Patient>(`${this.base}/${id}/deactivate`, {});
  }
}
