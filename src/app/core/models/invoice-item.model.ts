// Fase 8 T2: item de una factura. Puede venir de un service (precio de
// catálogo) o de un item de un plan de tratamiento ya existente — nunca
// de los dos a la vez en la práctica, pero el schema no lo prohíbe a
// nivel de tipos. Nunca se crea un treatment_plan desde acá (prohibido).
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_id: string | null;
  treatment_plan_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  // total = quantity * unit_price — lo recalcula el backend; en el mock
  // se guarda igual para no tener que recalcularlo en cada lectura.
  total: number;
}

export interface InvoiceItemDto {
  service_id: string | null;
  treatment_plan_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}
