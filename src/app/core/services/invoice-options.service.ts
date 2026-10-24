import { Injectable, signal } from '@angular/core';

export interface InvoiceBranchOption {
  id: string;
  name: string;
}

export interface InvoiceServiceOption {
  id: string;
  name: string;
  base_price: number;
  currency: string;
}

// patient_id: de qué paciente es este item de plan — sirve para filtrar
// el picker a los items del paciente que ya está elegido en la factura.
export interface InvoiceTreatmentPlanItemOption {
  id: string;
  patient_id: string;
  description: string;
  unit_price: number;
}

// Mock (T1/T2) — pendiente de conectar a BranchesService/ServicesService/TreatmentPlanItemsService reales.
const MOCK_BRANCHES: InvoiceBranchOption[] = [
  { id: 'inv-branch-centro', name: 'Sede Centro' },
  { id: 'inv-branch-norte', name: 'Sede Norte' },
];

const MOCK_SERVICES: InvoiceServiceOption[] = [
  { id: 'inv-svc-1', name: 'Consulta general', base_price: 80, currency: 'PEN' },
  { id: 'inv-svc-2', name: 'Limpieza dental', base_price: 120, currency: 'PEN' },
  { id: 'inv-svc-3', name: 'Control pediátrico', base_price: 60, currency: 'PEN' },
];

const MOCK_TREATMENT_PLAN_ITEMS: InvoiceTreatmentPlanItemOption[] = [
  { id: 'inv-tpi-1', patient_id: 'inv-patient-1', description: 'Resina (1 cara) — pieza 36', unit_price: 180 },
  { id: 'inv-tpi-2', patient_id: 'inv-patient-1', description: 'Corona de porcelana — pieza 46', unit_price: 950 },
  { id: 'inv-tpi-3', patient_id: 'inv-patient-2', description: 'Limpieza dental', unit_price: 120 },
];

@Injectable({ providedIn: 'root' })
export class InvoiceOptionsService {
  private readonly branchesSignal = signal<InvoiceBranchOption[]>(MOCK_BRANCHES);
  private readonly servicesSignal = signal<InvoiceServiceOption[]>(MOCK_SERVICES);
  private readonly treatmentPlanItemsSignal = signal<InvoiceTreatmentPlanItemOption[]>(MOCK_TREATMENT_PLAN_ITEMS);

  branches() {
    return this.branchesSignal.asReadonly();
  }

  services() {
    return this.servicesSignal.asReadonly();
  }

  treatmentPlanItems() {
    return this.treatmentPlanItemsSignal.asReadonly();
  }
}
