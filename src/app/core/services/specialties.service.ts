import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SpecialtiesApi } from './specialties-api';
import { CreateSpecialtyDto, Specialty, UpdateSpecialtyDto } from '../models/specialty.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Auto-load en constructor (mismo criterio que BranchesService).
@Injectable({ providedIn: 'root' })
export class SpecialtiesService {
  private api = inject(SpecialtiesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Specialty[]>([]);
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

  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.list().subscribe({
      next: (list: Specialty[]) => {
        this.records.set(list);
        this.loadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  create(dto: CreateSpecialtyDto): Observable<Specialty> {
    return this.api.create(dto).pipe(tap((created: Specialty) => this.upsertLocal(created)));
  }

  update(id: string, dto: UpdateSpecialtyDto): Observable<Specialty> {
    return this.api.update(id, dto).pipe(tap((updated: Specialty) => this.upsertLocal(updated)));
  }

  private upsertLocal(specialty: Specialty): void {
    this.records.update(list => {
      const exists = list.some(s => s.id === specialty.id);
      return exists
        ? list.map(s => (s.id === specialty.id ? specialty : s))
        : [specialty, ...list];
    });
  }
}
