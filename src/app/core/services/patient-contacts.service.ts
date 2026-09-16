import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { PatientContact, PatientContactDto } from '../models/patient-contact.model';
import { PatientContactsApi } from './patient-contacts-api';
import { contactsListErrorMessage } from '../../shared/utils/patient-contacts-error.util';

@Injectable({ providedIn: 'root' })
export class PatientContactsService {
  private api = inject(PatientContactsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<PatientContact[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/patients/:id/contacts — no corre en SSR: depende del
  // token del navegador. Reemplaza en el cache local solo las filas de ese
  // paciente (no toca las de otros que ya estén cargadas).
  loadForPatient(patientId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(patientId).subscribe({
      next: contacts => {
        this.records.update(list => [...list.filter(c => c.patient_id !== patientId), ...contacts]);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(contactsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/patients/:id/contacts
  create(patientId: string, dto: PatientContactDto): Observable<PatientContact> {
    return this.api.create(patientId, dto).pipe(tap(created => this.records.update(list => [...list, created])));
  }

  // PATCH /tenants/patients/:id/contacts/:contactId
  update(patientId: string, contactId: string, dto: PatientContactDto): Observable<PatientContact> {
    return this.api.update(patientId, contactId, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  // El ticket no da un endpoint dedicado para esto — es un PATCH parcial
  // con is_primary: true. Se asume que el backend desmarca a los demás
  // contactos del mismo paciente del lado del servidor; por eso acá se
  // vuelve a pedir el listado completo en vez de solo actualizar este
  // registro (así el cache local refleja esa exclusión mutua real).
  setPrimary(patientId: string, contactId: string): Observable<PatientContact> {
    return this.api.update(patientId, contactId, { is_primary: true }).pipe(
      tap(() => this.loadForPatient(patientId)),
    );
  }

  // DELETE /tenants/patients/:id/contacts/:contactId — solo actualiza el
  // cache local, sin recargar toda la página (criterio de aceptación de T5).
  remove(patientId: string, contactId: string): Observable<void> {
    return this.api.remove(patientId, contactId).pipe(tap(() => this.records.update(list => list.filter(c => c.id !== contactId))));
  }

  private upsertLocal(contact: PatientContact): void {
    this.records.update(list => list.map(c => (c.id === contact.id ? contact : c)));
  }
}
