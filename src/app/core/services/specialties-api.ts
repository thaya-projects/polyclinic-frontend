import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateSpecialtyDto, Specialty, UpdateSpecialtyDto } from '../models/specialty.model';

// HTTP puro. Tenant lo resuelve el backend desde el token.
@Injectable({ providedIn: 'root' })
export class SpecialtiesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/specialties`;

  list(): Observable<Specialty[]> {
    return this.http.get<Specialty[]>(this.base);
  }

  create(dto: CreateSpecialtyDto): Observable<Specialty> {
    return this.http.post<Specialty>(this.base, dto);
  }

  update(id: string, dto: UpdateSpecialtyDto): Observable<Specialty> {
    return this.http.patch<Specialty>(`${this.base}/${id}`, dto);
  }
}
