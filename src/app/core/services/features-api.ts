import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EnabledModulesResponse, FeaturesDto, UpdateEnabledModulesDto } from '../models/features.model';

// Capa HTTP pura de features:
//   GET  /tenants/me/features        → tenant lee sus módulos activos.
//   PATCH /superadmin/tenants/:id/settings → super admin override.
@Injectable({ providedIn: 'root' })
export class FeaturesApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getMine(): Observable<FeaturesDto> {
    return this.http.get<FeaturesDto>(`${this.base}/tenants/me/features`);
  }

  getTenantEnabledModules(tenantId: string): Observable<EnabledModulesResponse> {
    return this.http.get<EnabledModulesResponse>(`${this.base}/superadmin/tenants/${tenantId}/settings`);
  }

  updateEnabledModules(tenantId: string, dto: UpdateEnabledModulesDto): Observable<void> {
    return this.http.patch<void>(`${this.base}/superadmin/tenants/${tenantId}/settings`, dto);
  }
}
