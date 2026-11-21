import { Injectable, computed, inject } from '@angular/core';
import { BranchesService } from './branches.service';
import { ServicesService } from './services.service';

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

// Sucursales y servicios: catálogos reales (BranchesService/ServicesService
// ya conectados a HTTP), mapeados al shape liviano que espera el picker de
// items. Items de plan de tratamiento: TODAVÍA mock — el backend no expone
// un listado plano "todos los items de un paciente" (solo por plan), así
// que ese picker queda pendiente de un endpoint nuevo.
const MOCK_TREATMENT_PLAN_ITEMS: InvoiceTreatmentPlanItemOption[] = [
  { id: 'inv-tpi-1', patient_id: 'inv-patient-1', description: 'Resina (1 cara) — pieza 36', unit_price: 180 },
  { id: 'inv-tpi-2', patient_id: 'inv-patient-1', description: 'Corona de porcelana — pieza 46', unit_price: 950 },
  { id: 'inv-tpi-3', patient_id: 'inv-patient-2', description: 'Limpieza dental', unit_price: 120 },
];

@Injectable({ providedIn: 'root' })
export class InvoiceOptionsService {
  private branchesSvc = inject(BranchesService);
  private servicesSvc = inject(ServicesService);

  private readonly branchOptions = computed<InvoiceBranchOption[]>(() =>
    this.branchesSvc.getAll()().map(b => ({ id: b.id, name: b.name })),
  );
  private readonly serviceOptions = computed<InvoiceServiceOption[]>(() =>
    this.servicesSvc.getAll()().filter(s => s.is_active).map(s => ({
      id: s.id, name: s.name, base_price: s.base_price, currency: s.currency,
    })),
  );

  constructor() {
    this.servicesSvc.load();
  }

  branches() {
    return this.branchOptions;
  }

  services() {
    return this.serviceOptions;
  }

  treatmentPlanItems() {
    return () => MOCK_TREATMENT_PLAN_ITEMS;
  }
}
