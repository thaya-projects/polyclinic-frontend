import { Injectable, signal } from '@angular/core';

export interface TreatmentPlanServiceOption {
  id: string;
  name: string;
  base_price: number;
  currency: string;
}

export interface TreatmentPlanAppointmentOption {
  id: string;
  label: string;
}

// Mock (T2/T3), propio de este ticket — a propósito NO reutiliza
// ServicesService/AppointmentsService reales (ya conectados a HTTP en sus
// módulos) para que el form de items siga siendo 100% mock, sin disparar
// ninguna llamada real (eso es T4/T5).
const MOCK_SERVICES: TreatmentPlanServiceOption[] = [
  { id: 'tp-svc-1', name: 'Limpieza dental', base_price: 120, currency: 'PEN' },
  { id: 'tp-svc-2', name: 'Resina (1 cara)', base_price: 180, currency: 'PEN' },
  { id: 'tp-svc-3', name: 'Corona de porcelana', base_price: 950, currency: 'PEN' },
  { id: 'tp-svc-4', name: 'Extracción simple', base_price: 150, currency: 'PEN' },
];

// T3: citas YA existentes del paciente que se pueden linkear a un item —
// nunca se crea una cita nueva desde acá (criterio de aceptación).
const MOCK_APPOINTMENTS: TreatmentPlanAppointmentOption[] = [
  { id: 'tp-apt-1', label: '12 oct 2026 · 10:00 · Dra. Valeria Soto' },
  { id: 'tp-apt-2', label: '20 oct 2026 · 15:30 · Dr. Jorge Paredes' },
  { id: 'tp-apt-3', label: '02 nov 2026 · 09:00 · Dra. Camila Rojas' },
];

@Injectable({ providedIn: 'root' })
export class TreatmentPlanOptionsService {
  private readonly servicesSignal = signal<TreatmentPlanServiceOption[]>(MOCK_SERVICES);
  private readonly appointmentsSignal = signal<TreatmentPlanAppointmentOption[]>(MOCK_APPOINTMENTS);

  services() {
    return this.servicesSignal.asReadonly();
  }

  appointments() {
    return this.appointmentsSignal.asReadonly();
  }
}
