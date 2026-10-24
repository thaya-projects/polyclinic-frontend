import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Service, ServiceDto, ServicesPageResult, ServiceUpdateDto } from '../models/service.model';

// Capa HTTP pura — sin estado. ServicesService la consume.
@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/services`;

  // page_size alto a propósito: esta pantalla muestra el catálogo entero
  // agrupado por categoría, sin UI de paginación.
  getAll(): Observable<ServicesPageResult> {
    const params = new HttpParams().set('page', 1).set('page_size', 200);
    return this.http.get<ServicesPageResult>(this.base, { params });
  }

  create(dto: ServiceDto): Observable<Service> {
    return this.http.post<Service>(this.base, dto);
  }

  update(id: string, dto: ServiceUpdateDto): Observable<Service> {
    return this.http.patch<Service>(`${this.base}/${id}`, dto);
  }
}
