import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ProfessionalsApi } from './professionals-api';
import {
  CreateProfessionalDto, Professional, ReplaceSpecialtiesDto, UpdateProfessionalDto,
} from '../models/professional.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Auto-load en constructor (mismo criterio que BranchesService/SpecialtiesService).
@Injectable({ providedIn: 'root' })
export class ProfessionalsService {
  private api = inject(ProfessionalsApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Professional[]>([]);
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
      next: (list: Professional[]) => {
        this.records.set(list);
        this.loadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  create(dto: CreateProfessionalDto): Observable<Professional> {
    return this.api.create(dto).pipe(tap((p: Professional) => this.upsertLocal(p)));
  }

  update(id: string, dto: UpdateProfessionalDto): Observable<Professional> {
    return this.api.update(id, dto).pipe(tap((p: Professional) => this.upsertLocal(p)));
  }

  replaceSpecialties(id: string, dto: ReplaceSpecialtiesDto): Observable<Professional> {
    return this.api.replaceSpecialties(id, dto).pipe(tap((p: Professional) => this.upsertLocal(p)));
  }

  deactivate(id: string): Observable<Professional> {
    return this.api.deactivate(id).pipe(tap((p: Professional) => this.upsertLocal(p)));
  }

  private upsertLocal(professional: Professional): void {
    this.records.update(list => {
      const exists = list.some(p => p.id === professional.id);
      return exists
        ? list.map(p => (p.id === professional.id ? professional : p))
        : [professional, ...list];
    });
  }
}