import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CreateAvailabilityRequest, UpdateAvailabilityRequest, AvailabilityDto,
} from '../models/availability.model';

let nextId = 100;

const INITIAL_AVAILABILITY: AvailabilityDto[] = [
  { id: 'av-1', dayOfWeek: 'Monday',    startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30, totalSlots: 8, isActive: true },
  { id: 'av-2', dayOfWeek: 'Wednesday', startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30, totalSlots: 8, isActive: true },
  { id: 'av-3', dayOfWeek: 'Friday',    startTime: '08:00', endTime: '12:00', slotDurationMinutes: 20, totalSlots: 12, isActive: true },
];

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private byUser = signal<Record<string, AvailabilityDto[]>>({});

  private listFor(userId: string): AvailabilityDto[] {
    const map = this.byUser();
    if (!map[userId]) {
      this.byUser.set({ ...map, [userId]: INITIAL_AVAILABILITY });
      return INITIAL_AVAILABILITY;
    }
    return map[userId];
  }

  getAvailability(userId: string): Observable<AvailabilityDto[]> {
    return of(this.listFor(userId)).pipe(delay(300));
  }

  createAvailability(userId: string, req: CreateAvailabilityRequest): Observable<AvailabilityDto> {
    const entry: AvailabilityDto = { id: `av-${nextId++}`, ...req, totalSlots: 0, isActive: true };
    this.byUser.update(map => ({ ...map, [userId]: [...this.listFor(userId), entry] }));
    return of(entry).pipe(delay(300));
  }

  updateAvailability(userId: string, id: string, req: UpdateAvailabilityRequest): Observable<unknown> {
    this.byUser.update(map => ({
      ...map,
      [userId]: this.listFor(userId).map(a => (a.id === id ? { ...a, ...req } : a)),
    }));
    return of({}).pipe(delay(300));
  }

  deleteAvailability(userId: string, id: string): Observable<unknown> {
    this.byUser.update(map => ({
      ...map,
      [userId]: this.listFor(userId).filter(a => a.id !== id),
    }));
    return of({}).pipe(delay(300));
  }
}
