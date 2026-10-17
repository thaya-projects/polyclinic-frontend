import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { Service, ServiceDto } from '../models/service.model';
import { ServicesApi } from './services-api';
import { servicesListErrorMessage } from '../../shared/utils/services-error.util';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private api = inject(ServicesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Service[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/services — no corre en SSR: depende del token del navegador.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: services => {
        this.records.set(services);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(servicesListErrorMessage(err));
      },
    });
  }

  // POST /tenants/services
  create(dto: ServiceDto): Observable<Service> {
    return this.api.create(dto).pipe(tap(created => this.records.update(list => [...list, created])));
  }

  // PATCH /tenants/services/:id
  update(id: string, dto: ServiceDto): Observable<Service> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  // PATCH /tenants/services/:id (parcial) — activar/desactivar. Solo
  // actualiza el cache local, sin recargar todo el catálogo (criterio de
  // aceptación de T6).
  setActive(id: string, isActive: boolean): Observable<Service> {
    return this.api.update(id, { is_active: isActive }).pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(service: Service): void {
    this.records.update(list => list.map(s => (s.id === service.id ? service : s)));
  }
}
