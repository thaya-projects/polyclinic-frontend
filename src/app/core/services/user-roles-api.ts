import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRoleAssignment } from '../models/user-role-assignment.model';

// Capa HTTP pura — sin estado. UserRolesService la consume.
@Injectable({ providedIn: 'root' })
export class UserRolesApi {
  private http = inject(HttpClient);

  private base(userId: string): string {
    return `${environment.apiUrl}/tenants/users/${userId}/roles`;
  }

  getForUser(userId: string): Observable<UserRoleAssignment[]> {
    return this.http.get<UserRoleAssignment[]>(this.base(userId));
  }

  // PUT reemplaza el set completo de asignaciones del usuario. Body sin
  // tenant_id (T15) — el backend lo resuelve del tenant autenticado.
  replaceForUser(
    userId: string,
    assignments: { role_id: string; branch_id: string | null }[],
  ): Observable<UserRoleAssignment[]> {
    return this.http.put<UserRoleAssignment[]>(this.base(userId), assignments);
  }
}
