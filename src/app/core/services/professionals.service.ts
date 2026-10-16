import { Injectable, signal } from '@angular/core';
import { Professional } from '../models/professional.model';

// Mock (T5) — sin llamadas HTTP a propósito (eso es T6).
const MOCK_PROFESSIONALS: Professional[] = [
  { id: 'prof-1', full_name: 'Dra. Valeria Soto', specialty: 'Medicina general' },
  { id: 'prof-2', full_name: 'Dr. Jorge Paredes', specialty: 'Odontología' },
  { id: 'prof-3', full_name: 'Dra. Camila Rojas', specialty: 'Pediatría' },
];

@Injectable({ providedIn: 'root' })
export class ProfessionalsService {
  private readonly records = signal<Professional[]>(MOCK_PROFESSIONALS);

  getAll() {
    return this.records.asReadonly();
  }
}
