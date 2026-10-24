// Espeja BranchDTO (snake_case). tenant_id no viaja.
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateBranchDto {
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
}

// PATCH tri-state: campo ausente = no tocar, null = quitar, valor = asignar.
export interface UpdateBranchDto {
  name?: string;
  address?: string | null;
  phone?: string | null;
  timezone?: string;
}
