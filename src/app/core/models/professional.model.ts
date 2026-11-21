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
  // Viene siempre que create_login_account=true (no hay servicio de email: nunca se la
  // manda por correo) — se muestra una sola vez en el modal de alta, no se puede recuperar después.
  temporary_password: string | null;
}

export interface CreateProfessionalDto {
  full_name: string;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  specialty_ids: string[];
  // true crea una cuenta de acceso; requiere email y excluye user_id.
  create_login_account: boolean;
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