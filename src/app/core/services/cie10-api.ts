import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_ERROR_TOAST_STATUSES } from '../interceptors/http-error.interceptor';
import { environment } from '../../../environments/environment';
import { CIE10_SEARCH, Cie10Entry } from '../models/diagnosis.model';
import type { Cie10Catalog } from './cie10-catalog';

// Fase 4 T5: catálogo global CIE-10 (GET /tenants/cie10?q=&limit=). Implementación HTTP por
// defecto de CIE10_CATALOG. El 422 (q fuera de 2..100) lo muestra el buscador: sin toast global
// mientras se tipea.
@Injectable({ providedIn: 'root' })
export class Cie10Api implements Cie10Catalog {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/cie10`;

  search(q: string, limit: number = CIE10_SEARCH.defaultLimit): Observable<Cie10Entry[]> {
    const params = new HttpParams().set('q', q).set('limit', Math.min(Math.max(1, limit), CIE10_SEARCH.maxLimit));
    const context = new HttpContext().set(SKIP_ERROR_TOAST_STATUSES, [422]);
    return this.http.get<Cie10Entry[]>(this.base, { params, context });
  }
}
