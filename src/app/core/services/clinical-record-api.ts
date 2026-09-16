import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClinicalRecord, ClinicalRecordDto } from '../models/clinical-record.model';

// Capa HTTP pura — sin estado. ClinicalRecordsService la consume.
@Injectable({ providedIn: 'root' })
export class ClinicalRecordApi {
  private http = inject(HttpClient);

  private base(patientId: string): string {
    return `${environment.apiUrl}/tenants/patients/${patientId}/clinical-record`;
  }

  get(patientId: string): Observable<ClinicalRecord> {
    return this.http.get<ClinicalRecord>(this.base(patientId));
  }

  update(patientId: string, dto: ClinicalRecordDto): Observable<ClinicalRecord> {
    return this.http.patch<ClinicalRecord>(this.base(patientId), dto);
  }
}
