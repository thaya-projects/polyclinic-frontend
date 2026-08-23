import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CreateScheduleBlockRequest, ScheduleBlockDto } from '../models/schedule-block.model';

let nextId = 100;

@Injectable({ providedIn: 'root' })
export class ScheduleBlockService {
  private byUser = signal<Record<string, ScheduleBlockDto[]>>({});

  getScheduleBlocks(userId: string, _from?: string, _to?: string): Observable<ScheduleBlockDto[]> {
    return of(this.byUser()[userId] ?? []).pipe(delay(300));
  }

  createScheduleBlock(userId: string, req: CreateScheduleBlockRequest): Observable<ScheduleBlockDto> {
    const from = new Date(req.from);
    const to = new Date(req.to);
    const block: ScheduleBlockDto = {
      blockId: `block-${nextId++}`,
      from: req.from,
      to: req.to,
      reason: req.reason ?? null,
      durationHours: Math.max(0, (to.getTime() - from.getTime()) / 3_600_000),
    };
    this.byUser.update(map => ({ ...map, [userId]: [...(map[userId] ?? []), block] }));
    return of(block).pipe(delay(300));
  }

  deleteScheduleBlock(userId: string, blockId: string): Observable<unknown> {
    this.byUser.update(map => ({
      ...map,
      [userId]: (map[userId] ?? []).filter(b => b.blockId !== blockId),
    }));
    return of({}).pipe(delay(300));
  }
}
