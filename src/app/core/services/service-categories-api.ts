import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServiceCategory } from '../models/service-category.model';

// Capa HTTP pura — sin estado. ServiceCategoriesService la consume.
@Injectable({ providedIn: 'root' })
export class ServiceCategoriesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/service-categories`;

  getAll(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(this.base);
  }
}
