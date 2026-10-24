import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { ReminderRulesApi } from './reminder-rules-api';
import { ReminderRule, ReminderRuleDto } from '../models/reminder-rule.model';
import { reminderRulesListErrorMessage } from '../../shared/utils/reminder-rules-error.util';

@Injectable({ providedIn: 'root' })
export class ReminderRulesService {
  private api = inject(ReminderRulesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<ReminderRule[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  findById(id: string): ReminderRule | null {
    return this.records().find(r => r.id === id) ?? null;
  }

  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: rules => {
        this.records.set(rules);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(reminderRulesListErrorMessage(err));
      },
    });
  }

  create(dto: ReminderRuleDto): Observable<ReminderRule> {
    return this.api.create(dto).pipe(tap(rule => this.records.update(list => [rule, ...list])));
  }

  update(id: string, dto: ReminderRuleDto): Observable<ReminderRule> {
    return this.api.update(id, dto).pipe(tap(rule => this.upsertLocal(rule)));
  }

  private upsertLocal(rule: ReminderRule): void {
    this.records.update(list => list.map(r => (r.id === rule.id ? rule : r)));
  }
}
