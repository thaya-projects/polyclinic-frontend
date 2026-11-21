// Fase 8: factura de un paciente. Solo los campos de invoice permitidos
// por el schema — sin subscription_invoice/stripe/AFIP-SIN (prohibido en
// esta fase). tenant_id no viaja al frontend (sale del token).
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partial' | 'voided' | 'overdue';

export interface Invoice {
  id: string;
  patient_id: string;
  branch_id: string | null;
  // null mientras sigue en "borrador" — se asigna recién al pasar a
  // "emitida" (secuencial por tenant, lo hace el backend — eso es T3).
  invoice_number: string | null;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes: string | null;
  // Siempre null en v1 — no se integra AFIP/SIN (prohibido en esta fase).
  external_fiscal_id: string | null;
  // not null default now() — es la fecha de creación de la fila, no
  // depende de si ya se emitió o no (eso lo indica `status`).
  issued_at: string;
}

// Body del alta/edición de borrador (T2) — currency opcional: si no
// viene, el backend la completa con tenant.default_currency.
export interface InvoiceDto {
  patient_id: string;
  branch_id: string | null;
  notes: string | null;
  tax: number;
  currency?: string;
}

// GET /tenants/invoices?patient_id=&status=&from=&to= (T5) — sin filtro
// de texto libre por invoice_number: el backend no lo expone, por eso el
// buscador de la UI sigue aplicándose en el cliente sobre lo que ya trajo
// este query.
export interface InvoicesQuery {
  patient_id?: string;
  status?: InvoiceStatus;
  from?: string;
  to?: string;
}
