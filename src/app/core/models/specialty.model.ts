// Espeja SpecialtyDTO (snake_case). tenant_id null = global de plataforma (no editable).
export interface Specialty {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  is_active: boolean;
}

export interface CreateSpecialtyDto {
  code: string;
  name: string;
}

// PATCH parcial: campo ausente/null = no tocar. Code inmutable.
export interface UpdateSpecialtyDto {
  name?: string;
  is_active?: boolean;
}
