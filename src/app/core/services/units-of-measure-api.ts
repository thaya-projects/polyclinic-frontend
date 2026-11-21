import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUnitOfMeasureDto, UnitOfMeasure, UpdateUnitOfMeasureDto } from '../models/unit-of-measure.model';

// HTTP puro. Sin paginar — se pide el catálogo completo y se filtra client-side (igual que Branches).
@Injectable({ providedIn: 'root' })
export class UnitsOfMeasureApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/units-of-measure`;

  list(): Observable<UnitOfMeasure[]> {
    return this.http.get<UnitOfMeasure[]>(this.base);
  }

  create(dto: CreateUnitOfMeasureDto): Observable<UnitOfMeasure> {
    return this.http.post<UnitOfMeasure>(this.base, dto);
  }

  update(id: string, dto: UpdateUnitOfMeasureDto): Observable<UnitOfMeasure> {
    return this.http.patch<UnitOfMeasure>(`${this.base}/${id}`, dto);
  }
}
