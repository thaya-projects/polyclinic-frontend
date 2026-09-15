import { Injectable, signal } from '@angular/core';
import { ClinicUser } from '../models/clinic-user.model';

// Mock (T14) — no crea usuarios (fuera de alcance); solo sirve de contexto
// para elegir a quién se le asignan roles.
const MOCK_USERS: ClinicUser[] = [
  { id: 'user-1', full_name: 'Lucía Fernández', email: 'lucia.fernandez@clinica-demo.com' },
  { id: 'user-2', full_name: 'Martín Gómez', email: 'martin.gomez@clinica-demo.com' },
  { id: 'user-3', full_name: 'Sofía Ramírez', email: 'sofia.ramirez@clinica-demo.com' },
];

@Injectable({ providedIn: 'root' })
export class ClinicUsersService {
  private readonly records = signal<ClinicUser[]>(MOCK_USERS);

  getAll() {
    return this.records.asReadonly();
  }
}
