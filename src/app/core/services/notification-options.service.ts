import { Injectable, signal } from '@angular/core';

export interface NotificationPatientOption {
  id: string;
  first_name: string;
  last_name: string;
}

// Mock (T4), propio de esta fase — a propósito NO reutiliza PatientsService
// real (ya conectado a HTTP en su módulo) para que esta pantalla siga
// siendo 100% mock, sin disparar ninguna llamada real (eso es T5).
const MOCK_PATIENTS: NotificationPatientOption[] = [
  { id: 'notif-patient-1', first_name: 'Lucía', last_name: 'Fernández' },
  { id: 'notif-patient-2', first_name: 'Martín', last_name: 'Gómez' },
  { id: 'notif-patient-3', first_name: 'Sofía', last_name: 'Ramírez' },
];

@Injectable({ providedIn: 'root' })
export class NotificationOptionsService {
  private readonly patientsSignal = signal<NotificationPatientOption[]>(MOCK_PATIENTS);

  patients() {
    return this.patientsSignal.asReadonly();
  }
}
