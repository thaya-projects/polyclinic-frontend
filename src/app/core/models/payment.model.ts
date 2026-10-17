// Fase 8 T4: pago de una factura. Sin pasarelas de pago ni QR real — solo
// registra lo que ya se cobró por fuera (efectivo, tarjeta física, etc.).
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'qr' | 'transferencia' | 'otro';

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
}

// No permite editar ni borrar pagos (fuera de alcance) — por eso no hay
// UpdatePaymentDto.
export interface PaymentDto {
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  // opcional — si no viene, el backend usa now() (igual que invoice.issued_at).
  paid_at?: string;
}
