import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { CreatePatientDto, Patient, PatientsQuery } from '../models/patient.model';
import { PatientsApi } from './patients-api';
import { patientsListErrorMessage } from '../../shared/utils/patients-error.util';

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private api = inject(PatientsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Patient[]>([]);
  private readonly totalSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): Patient | null {
    return this.records().find(p => p.id === id) ?? null;
  }

  // GET /tenants/patients/:id — para la página de ficha, independiente de que el
  // listado esté cargado (ej. entrar directo por URL).
  getById(id: string): Observable<Patient> {
    return this.api.getById(id);
  }

  // GET /tenants/patients?q=&document=&page=&limit= — no corre en SSR:
  // depende del token del navegador. La página es quien decide cuándo
  // volver a pedir (cambió la búsqueda, la página, o se creó un registro).
  load(query: PatientsQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: res => {
        this.records.set(res.items);
        this.totalSignal.set(res.total);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(patientsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/patients — quien llama decide si conviene recargar el listado.
  create(dto: CreatePatientDto): Observable<Patient> {
    return this.api.create(dto);
  }

  // PATCH /tenants/patients/:id — actualiza el registro local con la
  // respuesta, sin re-pedir todo el listado.
  update(id: string, dto: CreatePatientDto): Observable<Patient> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  // POST /tenants/patients/:id/deactivate — baja lógica. Igual que
  // update(): solo actualiza ese registro en memoria, sin recargar toda
  // la página (criterio de aceptación de T7).
  deactivate(id: string): Observable<Patient> {
    return this.api.deactivate(id).pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(patient: Patient): void {
    this.records.update(list => list.map(p => (p.id === patient.id ? patient : p)));
  }
}
