import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../models/branch.model';

// HTTP puro. Tenant lo resuelve el backend desde el token.
@Injectable({ providedIn: 'root' })
export class BranchesApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/branches`;

  list(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.base);
  }

  getById(id: string): Observable<Branch> {
    return this.http.get<Branch>(`${this.base}/${id}`);
  }

  create(dto: CreateBranchDto): Observable<Branch> {
    return this.http.post<Branch>(this.base, dto);
  }

  update(id: string, dto: UpdateBranchDto): Observable<Branch> {
    return this.http.patch<Branch>(`${this.base}/${id}`, dto);
  }

  deactivate(id: string): Observable<Branch> {
    return this.http.post<Branch>(`${this.base}/${id}/deactivate`, {});
  }
}
