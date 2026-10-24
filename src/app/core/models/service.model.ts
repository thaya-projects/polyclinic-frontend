// Tabla `service` (T1, Fase 4): code, name, category_id, duration_minutes,
// base_price, currency, is_active. Nada de agenda/citas — eso es otra
// tabla, fuera de alcance acá (y prohibido mostrarla).
export interface Service {
  id: string;
  code: string;
  name: string;
  category_id: string | null;
  duration_minutes: number;
  base_price: number;
  currency: string;
  is_active: boolean;
}

// Body del alta/edición (T5) — exactamente los campos que pide el ticket
// para el form: name, category, duration_minutes, base_price, currency.
// code no va acá: se genera del lado del backend.
export type ServiceDto = Pick<Service, 'name' | 'category_id' | 'duration_minutes' | 'base_price' | 'currency'>;

// Body de PATCH (T6) — el form manda los 5 campos de siempre; la acción
// de activar/desactivar manda un PATCH parcial con solo is_active.
export type ServiceUpdateDto = Partial<ServiceDto> & Partial<Pick<Service, 'is_active'>>;

// GET /tenants/services devuelve esto, no un array plano.
export interface ServicesPageResult {
  items: Service[];
  total_count: number;
  current_page: number;
  page_size: number;
  total_pages: number;
}
