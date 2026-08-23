import { Injectable, computed, signal } from '@angular/core';
import { Appointment } from '../models/appointment.model';
import { APPOINTMENTS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private _appointments = signal<Appointment[]>(APPOINTMENTS);

  weeklyAppointments(doctorId: string) {
    return computed(() =>
      this._appointments().filter(a => a.doctorId === doctorId)
    );
  }

  videoAppointments(doctorId: string) {
    return computed(() =>
      this._appointments()
        .filter(a => a.doctorId === doctorId && a.type === 'video')
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    );
  }

  appointmentById(id: string) {
    return computed(() => this._appointments().find(a => a.id === id));
  }

  appointmentsByDate(doctorId: string, date: Date) {
    return computed(() =>
      this._appointments().filter(a =>
        a.doctorId === doctorId &&
        a.date.toDateString() === date.toDateString()
      )
    );
  }

  add(appointment: Appointment) {
    this._appointments.update(list => [...list, appointment]);
  }
}
