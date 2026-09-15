import { Injectable, signal } from '@angular/core';
import { Branch } from '../models/branch.model';

// Mock (T14) — no crea/edita sucursales (fuera de alcance); solo sirve de
// lista para el selector de sucursal al asignar roles.
const MOCK_BRANCHES: Branch[] = [
  { id: 'branch-centro', name: 'Sede Centro' },
  { id: 'branch-norte', name: 'Sede Norte' },
  { id: 'branch-sur', name: 'Sede Sur' },
];

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly records = signal<Branch[]>(MOCK_BRANCHES);

  getAll() {
    return this.records.asReadonly();
  }
}
