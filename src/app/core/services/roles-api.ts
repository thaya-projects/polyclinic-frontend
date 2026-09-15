import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClinicRole, RoleDto } from '../models/clinic-role.model';

// Capa HTTP pura — sin estado. ClinicRolesService la consume y le agrega
// el signal/estado reactivo para la UI.
@Injectable({ providedIn: 'root' })
export class RolesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/roles`;

  getAll(): Observable<ClinicRole[]> {
    return this.http.get<ClinicRole[]>(this.base);
  }

  create(dto: RoleDto): Observable<ClinicRole> {
    return this.http.post<ClinicRole>(this.base, dto);
  }

  update(id: string, dto: RoleDto): Observable<ClinicRole> {
    return this.http.patch<ClinicRole>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
