import { Injectable, signal } from '@angular/core';
import { AppointmentPatientOption, AppointmentServiceOption } from '../models/appointment.model';

// Mock (T5), propio de este ticket — a propósito NO reutiliza
// PatientsService/ServicesService reales (ya conectadas a HTTP en sus
// módulos) para que el calendario/form de citas siga siendo 100% mock,
// sin disparar ninguna llamada real (eso es T6).
const MOCK_PATIENTS: AppointmentPatientOption[] = [
  { id: 'apt-patient-1', first_name: 'Lucía', last_name: 'Fernández' },
  { id: 'apt-patient-2', first_name: 'Martín', last_name: 'Gómez' },
  { id: 'apt-patient-3', first_name: 'Sofía', last_name: 'Ramírez' },
];

const MOCK_SERVICES: AppointmentServiceOption[] = [
  { id: 'apt-svc-1', name: 'Consulta general', duration_minutes: 30 },
  { id: 'apt-svc-2', name: 'Limpieza dental', duration_minutes: 45 },
  { id: 'apt-svc-3', name: 'Control pediátrico', duration_minutes: 20 },
];

@Injectable({ providedIn: 'root' })
export class AppointmentOptionsService {
  private readonly patientsSignal = signal<AppointmentPatientOption[]>(MOCK_PATIENTS);
  private readonly servicesSignal = signal<AppointmentServiceOption[]>(MOCK_SERVICES);

  patients() {
    return this.patientsSignal.asReadonly();
  }

  services() {
    return this.servicesSignal.asReadonly();
  }
}
