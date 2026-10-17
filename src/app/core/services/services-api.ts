import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Service, ServiceDto, ServiceUpdateDto } from '../models/service.model';

// Capa HTTP pura — sin estado. ServicesService la consume.
@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/services`;

  getAll(): Observable<Service[]> {
    return this.http.get<Service[]>(this.base);
  }

  create(dto: ServiceDto): Observable<Service> {
    return this.http.post<Service>(this.base, dto);
  }

  update(id: string, dto: ServiceUpdateDto): Observable<Service> {
    return this.http.patch<Service>(`${this.base}/${id}`, dto);
  }
}
