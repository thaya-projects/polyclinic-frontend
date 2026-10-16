import { Injectable, signal } from '@angular/core';
import { Room } from '../models/room.model';

// Mock (T5) — sin llamadas HTTP a propósito (eso es T6).
const MOCK_ROOMS: Room[] = [
  { id: 'room-1', name: 'Consultorio 1', branch_id: 'branch-centro' },
  { id: 'room-2', name: 'Consultorio 2', branch_id: 'branch-centro' },
  { id: 'room-3', name: 'Consultorio 1', branch_id: 'branch-norte' },
  { id: 'room-4', name: 'Consultorio 1', branch_id: 'branch-sur' },
];

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private readonly records = signal<Room[]>(MOCK_ROOMS);

  getAll() {
    return this.records.asReadonly();
  }
}
