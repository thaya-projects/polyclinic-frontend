import { Injectable, computed, signal } from '@angular/core';
import { Prescription } from '../models/prescription.model';
import { PRESCRIPTIONS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private _prescriptions = signal<Prescription[]>(PRESCRIPTIONS);

  latestByPatient(patientId: string) {
    return computed(() =>
      this._prescriptions()
        .filter(r => r.patientId === patientId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
    );
  }

  issue(prescription: Prescription) {
    this._prescriptions.update(list => [prescription, ...list]);
  }
}
