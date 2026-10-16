import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SchedulesApi } from './schedules-api';
import {
  CreateScheduleExceptionDto, ReplaceScheduleDto, ScheduleBlock, ScheduleException,
} from '../models/schedule.model';
import { httpErrorMessage } from '../../shared/utils/http-error.util';

// Sin auto-load — depende del professional seleccionado. La page llama loadScheduleFor/loadExceptions.
@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private api = inject(SchedulesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly scheduleRecords = signal<ScheduleBlock[]>([]);
  private readonly exceptionRecords = signal<ScheduleException[]>([]);
  private readonly scheduleLoadingSignal = signal(false);
  private readonly exceptionsLoadingSignal = signal(false);
  private readonly scheduleErrorSignal = signal<string | null>(null);
  private readonly exceptionsErrorSignal = signal<string | null>(null);

  readonly schedule = this.scheduleRecords.asReadonly();
  readonly exceptions = this.exceptionRecords.asReadonly();
  readonly scheduleLoading = this.scheduleLoadingSignal.asReadonly();
  readonly exceptionsLoading = this.exceptionsLoadingSignal.asReadonly();
  readonly scheduleError = this.scheduleErrorSignal.asReadonly();
  readonly exceptionsError = this.exceptionsErrorSignal.asReadonly();

  loadScheduleFor(professionalId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.scheduleLoadingSignal.set(true);
    this.scheduleErrorSignal.set(null);
    this.api.getScheduleFor(professionalId).subscribe({
      next: (list: ScheduleBlock[]) => {
        this.scheduleRecords.set(list);
        this.scheduleLoadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.scheduleLoadingSignal.set(false);
        this.scheduleErrorSignal.set(httpErrorMessage(err));
        this.scheduleRecords.set([]);
      },
    });
  }

  replaceSchedule(professionalId: string, dto: ReplaceScheduleDto): Observable<ScheduleBlock[]> {
    return this.api.replaceSchedule(professionalId, dto).pipe(
      tap((list: ScheduleBlock[]) => this.scheduleRecords.set(list)));
  }

  loadExceptions(professionalId?: string, branchId?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.exceptionsLoadingSignal.set(true);
    this.exceptionsErrorSignal.set(null);
    this.api.listExceptions(professionalId, branchId).subscribe({
      next: (list: ScheduleException[]) => {
        this.exceptionRecords.set(list);
        this.exceptionsLoadingSignal.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.exceptionsLoadingSignal.set(false);
        this.exceptionsErrorSignal.set(httpErrorMessage(err));
        this.exceptionRecords.set([]);
      },
    });
  }

  createException(dto: CreateScheduleExceptionDto): Observable<ScheduleException> {
    return this.api.createException(dto).pipe(
      tap((e: ScheduleException) => this.exceptionRecords.update(list => [e, ...list])));
  }

  deleteException(id: string): Observable<void> {
    return this.api.deleteException(id).pipe(
      tap(() => this.exceptionRecords.update(list => list.filter(e => e.id !== id))));
  }
}
