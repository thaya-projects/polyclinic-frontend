import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { CreateUnitOfMeasureDto, UnitOfMeasure, UpdateUnitOfMeasureDto } from '../models/unit-of-measure.model';
import { UnitsOfMeasureApi } from './units-of-measure-api';
import { unitsListErrorMessage } from '../../shared/utils/units-error.util';

// Auto-load en constructor: material-form lo necesita listo para el selector sin pedirlo a mano.
@Injectable({ providedIn: 'root' })
export class UnitsOfMeasureService {
  private api = inject(UnitsOfMeasureApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<UnitOfMeasure[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor() {
    this.load();
  }

  getAll() {
    return this.records.asReadonly();
  }

  find(id: string): UnitOfMeasure | null {
    return this.records().find(u => u.id === id) ?? null;
  }

  // SSR-safe. GET /tenants/units-of-measure (sin filtro: se trae todo, is_active se filtra en el cliente).
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.list().subscribe({
      next: list => {
        this.records.set(list);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(unitsListErrorMessage(err));
      },
    });
  }

  create(dto: CreateUnitOfMeasureDto): Observable<UnitOfMeasure> {
    return this.api.create(dto).pipe(tap(created => this.upsertLocal(created)));
  }

  update(id: string, dto: UpdateUnitOfMeasureDto): Observable<UnitOfMeasure> {
    return this.api.update(id, dto).pipe(tap(updated => this.upsertLocal(updated)));
  }

  setActive(id: string, isActive: boolean): Observable<UnitOfMeasure> {
    return this.api.update(id, { is_active: isActive }).pipe(tap(updated => this.upsertLocal(updated)));
  }

  private upsertLocal(unit: UnitOfMeasure): void {
    this.records.update(list => {
      const exists = list.some(u => u.id === unit.id);
      return exists ? list.map(u => (u.id === unit.id ? unit : u)) : [unit, ...list];
    });
  }
}
