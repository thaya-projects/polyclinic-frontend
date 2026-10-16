// Espeja ProfessionalDTO (snake_case). tenant_id no viaja. Nunca incluye password_hash.
export interface Professional {
  id: string;
  user_id: string | null;
  full_name: string;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  specialty_ids: string[];
}

export interface CreateProfessionalDto {
  full_name: string;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  specialty_ids: string[];
}

// PATCH tri-state: campo ausente = no tocar, null = quitar (o unlink en user_id).
// Code inmutable. is_active y specialty_ids se manejan por endpoints separados.
export interface UpdateProfessionalDto {
  full_name?: string;
  license_number?: string | null;
  email?: string | null;
  phone?: string | null;
  user_id?: string | null;
}

export interface ReplaceSpecialtiesDto {
  specialty_ids: string[];
}
