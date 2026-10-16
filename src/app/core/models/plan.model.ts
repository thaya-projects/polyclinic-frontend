// Snake_case a propósito: calza con la política JSON global del backend
// (JsonNamingPolicy.SnakeCaseLower en Program.cs). Espeja los DTOs de
// Polyclinic.Application.UseCases.SuperAdmin.SubscriptionPlans.Dtos.

export interface Plan {
  id: string;
  code: string;
  name: string;
  price_month: number;
  currency: string;
  max_professionals: number | null;
  max_branches: number | null;
  allow_multi_specialty: boolean;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface CreatePlanDto {
  code: string;
  name: string;
  price_month: number;
  currency: string;
  max_professionals: number | null;
  max_branches: number | null;
  allow_multi_specialty: boolean;
  features: Record<string, unknown>;
  is_active?: boolean;
}

// PATCH tri-state. Contrato con el backend (Optional<T>):
//   campo omitido      → no tocar
//   campo con valor    → asignar
//   campo con null     → quitar el límite (solo para los que son NULLABLE en BD)
// JSON.stringify omite undefined y conserva null, así que basta con no incluir la clave o
// mandarla como null explícito para expresar cada intención.
export interface UpdatePlanDto {
  name?: string;
  price_month?: number;
  currency?: string;
  max_professionals?: number | null;
  max_branches?: number | null;
  allow_multi_specialty?: boolean;
  features?: Record<string, unknown>;
  is_active?: boolean;
}

export interface PlanListFilter {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}
