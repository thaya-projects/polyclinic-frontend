// Stock por sucursal: saldo (`StockBalance`) + movimientos que lo explican (`StockMovement`).
// transfer_out/transfer_in los crea el backend (POST /tenants/stock/transfer, 2 movimientos
// atómicos) — nunca se piden directos vía /movements, por eso StockMovementCreateType los excluye.
export type StockMovementType = 'inbound' | 'consumption' | 'adjustment' | 'transfer_out' | 'transfer_in';
export type StockMovementCreateType = 'inbound' | 'consumption' | 'adjustment';

export interface StockBalance {
  id: string;
  tenant_id: string;
  branch_id: string;
  material_id: string;
  quantity: number;
}

export interface StockSummaryByBranch {
  branch_id: string;
  material_id: string;
  material_code: string | null;
  material_name: string;
  quantity: number;
}

export interface StockSummaryTotal {
  material_id: string;
  material_code: string | null;
  material_name: string;
  quantity: number;
}

// GET /tenants/stock/summary
export interface StockSummary {
  by_branch: StockSummaryByBranch[];
  total_clinic: StockSummaryTotal[];
}

export interface StockMovement {
  id: string;
  tenant_id: string;
  branch_id: string;
  material_id: string;
  type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  currency: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

// quantity: magnitud positiva para inbound/consumption; con signo propio (≠0) para adjustment.
export interface CreateStockMovementDto {
  branch_id: string;
  material_id: string;
  type: StockMovementCreateType;
  quantity: number;
  unit_cost?: number | null;
  currency?: string | null;
  note?: string | null;
}

export interface TransferStockDto {
  material_id: string;
  from_branch_id: string;
  to_branch_id: string;
  quantity: number;
  note?: string | null;
}

// POST /tenants/stock/transfer — 2 movimientos atómicos (si falla, se revierte todo).
export interface TransferStockResult {
  outbound_movement: StockMovement;
  inbound_movement: StockMovement;
}
