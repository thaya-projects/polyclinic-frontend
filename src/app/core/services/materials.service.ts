import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { CreateMaterialDto, Material, MaterialsQuery, UpdateMaterialDto } from '../models/material.model';
import { MaterialsApi } from './materials-api';
import { materialsListErrorMessage } from '../../shared/utils/materials-error.util';

@Injectable({ providedIn: 'root' })
export class MaterialsService {
  private api = inject(MaterialsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Material[]>([]);
  private readonly totalSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): Material | null {
    return this.records().find(m => m.id === id) ?? null;
  }

  // GET /tenants/materials?page=&limit=&is_active=&category= — no corre en SSR: depende del token
  // del navegador. El caller decide cuándo volver a pedir (cambió un filtro, la página, o se creó un registro).
  load(query: MaterialsQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: res => {
        this.records.set(res.items);
        this.totalSignal.set(res.total_count);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(materialsListErrorMessage(err));
      },
    });
  }

  // POST /tenants/materials — con paginación real no tiene sentido insertarlo local; el caller
  // recarga la página 1 (igual que PatientsPage.onCreate).
  create(dto: CreateMaterialDto): Observable<Material> {
    return this.api.create(dto);
  }

  // PATCH /tenants/materials/:id — actualiza el registro local con la respuesta, sin re-pedir todo el listado.
  update(id: string, dto: UpdateMaterialDto): Observable<Material> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  setActive(id: string, isActive: boolean): Observable<Material> {
    return this.api.update(id, { is_active: isActive }).pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(material: Material): void {
    this.records.update(list => list.map(m => (m.id === material.id ? material : m)));
  }
}
