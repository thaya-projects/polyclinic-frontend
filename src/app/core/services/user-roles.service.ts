import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { UserRoleAssignment } from '../models/user-role-assignment.model';
import { UserRolesApi } from './user-roles-api';
import { userRolesListErrorMessage } from '../../shared/utils/roles-error.util';

@Injectable({ providedIn: 'root' })
export class UserRolesService {
  private api = inject(UserRolesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<UserRoleAssignment[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/users/:userId/roles — no corre en SSR: depende del token
  // del navegador. Reemplaza en el cache local solo las filas de ese
  // usuario (no toca las de otros que ya estén cargadas).
  loadForUser(userId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getForUser(userId).subscribe({
      next: assignments => {
        this.records.update(list => [...list.filter(a => a.user_id !== userId), ...assignments]);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(userRolesListErrorMessage(err));
      },
    });
  }

  // PUT /tenants/users/:userId/roles — reemplaza el set completo. La UI se
  // actualiza con lo que el backend confirma que quedó guardado (no con el
  // draft optimista), para reflejar el reemplazo real tras el PUT.
  setForUser(
    userId: string,
    assignments: { role_id: string; branch_id: string | null }[],
  ): Observable<UserRoleAssignment[]> {
    return this.api.replaceForUser(userId, assignments).pipe(
      tap(saved => {
        this.records.update(list => [...list.filter(a => a.user_id !== userId), ...saved]);
      }),
    );
  }
}
