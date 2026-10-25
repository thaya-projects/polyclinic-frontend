import { TestBed } from '@angular/core/testing';
import { CalendarView } from './calendar-view';
import { Appointment } from '../../../core/models/appointment.model';

function appt(id: string, start: string, end: string, extra: Partial<Appointment> = {}): Appointment {
  return {
    id, branch_id: 'b', patient_id: 'p', professional_id: 'pr', service_id: 's', room_id: null,
    starts_at: start, ends_at: end, reason: null, notes: null, status: 'scheduled', ...extra,
  };
}

describe('CalendarView', () => {
  it('renderiza la semana con citas simultáneas apiladas en la misma fila', async () => {
    const fixture = TestBed.createComponent(CalendarView);
    fixture.componentRef.setInput('viewMode', 'week');
    fixture.componentRef.setInput('referenceDate', new Date(2026, 9, 26));
    fixture.componentRef.setInput('appointments', [
      appt('1', new Date(2026, 9, 26, 9, 0).toISOString(), new Date(2026, 9, 26, 9, 30).toISOString(), { patient_name: 'Ana Lopez' }),
      appt('2', new Date(2026, 9, 26, 9, 0).toISOString(), new Date(2026, 9, 26, 9, 40).toISOString(), { status: 'cancelled' }),
      appt('3', new Date(2026, 9, 28, 15, 0).toISOString(), new Date(2026, 9, 28, 15, 45).toISOString()),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('sáb');
    expect(el.querySelectorAll('button').length).toBe(3);
    expect(el.textContent).toContain('Ana Lopez');
  });
});
