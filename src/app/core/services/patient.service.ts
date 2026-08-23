import { Injectable, computed, signal } from '@angular/core';
import { Patient } from '../models/patient.model';
import { PATIENTS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private _patients = signal<Patient[]>(PATIENTS);

  search(term: string) {
    return computed(() =>
      term.length < 2 ? [] :
      this._patients().filter(p =>
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        p.documentId.includes(term)
      )
    );
  }

  all() {
    return computed(() => this._patients());
  }

  byId(id: string) {
    return computed(() => this._patients().find(p => p.id === id));
  }
}
