import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RoomsApi } from './rooms-api';
import { CreateRoomDto, Room, UpdateRoomDto } from '../models/room.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Sin auto-load — rooms siempre requiere branch seleccionada por el usuario para evitar listar
// todas de todo el tenant al abrir la página. La page llama loadFor(branchId) explícitamente.
@Injectable({ providedIn: 'root' })
export class RoomsService {
  private api = inject(RoomsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Room[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private currentBranchId: string | null = null;

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  loadFor(branchId: string | null): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.currentBranchId = branchId;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.list(branchId ?? undefined).subscribe({
      next: (list: Room[]) => {
        this.records.set(list);
        this.loadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
        this.records.set([]);
      },
    });
  }

  create(dto: CreateRoomDto): Observable<Room> {
    return this.api.create(dto).pipe(tap((r: Room) => this.appendIfMatchesCurrent(r)));
  }

  update(id: string, dto: UpdateRoomDto): Observable<Room> {
    return this.api.update(id, dto).pipe(tap((r: Room) => this.upsertOrRemoveLocal(r)));
  }

  // Sincroniza el signal con el branch actualmente filtrado — si el nuevo room es de otra branch
  // (ej. usuario eligió otra en el modal), no lo mete en la lista visible.
  private appendIfMatchesCurrent(room: Room): void {
    if (this.currentBranchId !== null && room.branch_id !== this.currentBranchId) return;
    this.records.update(list => [room, ...list]);
  }

  // Si el update movió la sala a otra branch, sacarla del listado actual. Si sigue en la misma,
  // reemplazarla.
  private upsertOrRemoveLocal(room: Room): void {
    this.records.update(list => {
      const movedOut = this.currentBranchId !== null && room.branch_id !== this.currentBranchId;
      if (movedOut) return list.filter(r => r.id !== room.id);
      const exists = list.some(r => r.id === room.id);
      return exists ? list.map(r => (r.id === room.id ? room : r)) : [room, ...list];
    });
  }
}
