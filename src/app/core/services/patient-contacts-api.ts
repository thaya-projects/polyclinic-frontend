import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientContact, PatientContactDto, PatientContactUpdateDto } from '../models/patient-contact.model';

// Capa HTTP pura — sin estado. PatientContactsService la consume.
@Injectable({ providedIn: 'root' })
export class PatientContactsApi {
  private http = inject(HttpClient);

  private base(patientId: string): string {
    return `${environment.apiUrl}/tenants/patients/${patientId}/contacts`;
  }

  getAll(patientId: string): Observable<PatientContact[]> {
    return this.http.get<PatientContact[]>(this.base(patientId));
  }

  create(patientId: string, dto: PatientContactDto): Observable<PatientContact> {
    return this.http.post<PatientContact>(this.base(patientId), dto);
  }

  update(patientId: string, contactId: string, dto: PatientContactUpdateDto): Observable<PatientContact> {
    return this.http.patch<PatientContact>(`${this.base(patientId)}/${contactId}`, dto);
  }

  remove(patientId: string, contactId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(patientId)}/${contactId}`);
  }
}
