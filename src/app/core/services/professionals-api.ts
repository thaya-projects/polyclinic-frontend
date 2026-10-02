import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateProfessionalDto, Professional, ReplaceSpecialtiesDto, UpdateProfessionalDto,
} from '../models/professional.model';

// HTTP puro. Tenant lo resuelve el backend desde el token.
@Injectable({ providedIn: 'root' })
export class ProfessionalsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/professionals`;

  list(): Observable<Professional[]> {
    return this.http.get<Professional[]>(this.base);
  }

  getById(id: string): Observable<Professional> {
    return this.http.get<Professional>(`${this.base}/${id}`);
  }

  create(dto: CreateProfessionalDto): Observable<Professional> {
    return this.http.post<Professional>(this.base, dto);
  }

  update(id: string, dto: UpdateProfessionalDto): Observable<Professional> {
    return this.http.patch<Professional>(`${this.base}/${id}`, dto);
  }

  replaceSpecialties(id: string, dto: ReplaceSpecialtiesDto): Observable<Professional> {
    return this.http.put<Professional>(`${this.base}/${id}/specialties`, dto);
  }

  deactivate(id: string): Observable<Professional> {
    return this.http.post<Professional>(`${this.base}/${id}/deactivate`, {});
  }
}
