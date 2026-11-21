import { StockMovementCreateType, StockMovementType } from '../models/stock.model';

// Solo estos 3 se pueden elegir al registrar un movimiento suelto (POST /tenants/stock/movements).
export const STOCK_MOVEMENT_CREATE_TYPES: StockMovementCreateType[] = ['inbound', 'consumption', 'adjustment'];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  inbound: 'Ingreso',
  consumption: 'Consumo',
  adjustment: 'Ajuste',
  transfer_out: 'Transferencia (salida)',
  transfer_in: 'Transferencia (entrada)',
};
