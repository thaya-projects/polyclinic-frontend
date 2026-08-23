import { Injectable, computed, signal } from '@angular/core';
import { HistoryEntry } from '../models/history.model';
import { HISTORY } from './mock-data';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private _entries = signal<HistoryEntry[]>(HISTORY);

  byPatient(patientId: string) {
    return computed(() =>
      this._entries()
        .filter(e => e.patientId === patientId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    );
  }

  add(entry: HistoryEntry) {
    this._entries.update(list => [entry, ...list]);
  }
}
