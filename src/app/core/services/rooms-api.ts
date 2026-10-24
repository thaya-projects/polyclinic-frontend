import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateRoomDto, Room, UpdateRoomDto } from '../models/room.model';

// HTTP puro. Tenant lo resuelve el backend desde el token.
@Injectable({ providedIn: 'root' })
export class RoomsApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/rooms`;

  // branchId opcional — sin filter el backend devuelve todas las salas del tenant.
  list(branchId?: string): Observable<Room[]> {
    const params = branchId ? new HttpParams().set('branch_id', branchId) : undefined;
    return this.http.get<Room[]>(this.base, { params });
  }

  create(dto: CreateRoomDto): Observable<Room> {
    return this.http.post<Room>(this.base, dto);
  }

  update(id: string, dto: UpdateRoomDto): Observable<Room> {
    return this.http.patch<Room>(`${this.base}/${id}`, dto);
  }
}
