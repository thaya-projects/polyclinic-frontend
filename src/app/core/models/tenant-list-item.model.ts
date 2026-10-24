import { TenantStatus } from './tenant.model';

// Forma real de un elemento de GET /superadmin/tenants (TenantListItemDTO en el backend) —
// snake_case a propósito, calza tal cual con el JSON. Distinta de TenantDetail: el backend usa
// un DTO más liviano para la lista (sin default_timezone/locale/billing/etc.), no es el mismo
// objeto que GET /superadmin/tenants/:id.
export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  default_currency: string;
  is_active: boolean;
  subscription_status: TenantStatus | null;
  plan_name: string | null;
  users_count: number;
  created_at: string;
}

// Forma real del envoltorio paginado (PagedResult<T> en el backend).
export interface PagedResponse<T> {
  items: T[];
  total_count: number;
  current_page: number;
  page_size: number;
  total_pages: number;
}
