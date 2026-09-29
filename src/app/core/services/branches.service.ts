import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { BranchesApi } from './branches-api';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../models/branch.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Auto-load en constructor para que consumers que solo leen getAll() funcionen sin cambios.
@Injectable({ providedIn: 'root' })
export class BranchesService {
  private api = inject(BranchesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<Branch[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor() {
    // Fire-and-forget: ante 401/403 queda records=[] (default cerrado).
    this.load();
  }

  getAll() {
    return this.records.asReadonly();
  }

  find(id: string): Branch | null {
    return this.records().find(b => b.id === id) ?? null;
  }

  // SSR-safe.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.list().subscribe({
      next: (list: Branch[]) => {
        this.records.set(list);
        this.loadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(httpErrorMessage(err));
      },
    });
  }

  create(dto: CreateBranchDto): Observable<Branch> {
    return this.api.create(dto).pipe(tap((created: Branch) => this.upsertLocal(created)));
  }

  update(id: string, dto: UpdateBranchDto): Observable<Branch> {
    return this.api.update(id, dto).pipe(tap((updated: Branch) => this.upsertLocal(updated)));
  }

  deactivate(id: string): Observable<Branch> {
    return this.api.deactivate(id).pipe(tap((updated: Branch) => this.upsertLocal(updated)));
  }

  private upsertLocal(branch: Branch): void {
    this.records.update(list => {
      const exists = list.some(b => b.id === branch.id);
      return exists ? list.map(b => (b.id === branch.id ? branch : b)) : [branch, ...list];
    });
  }
}
