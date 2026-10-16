// Espeja Polyclinic.Domain.Pagination.PagedResult<T> serializado en snake_case por el backend.
export interface PagedResult<T> {
  items: T[];
  total_count: number;
  current_page: number;
  page_size: number;
  total_pages: number;
}
