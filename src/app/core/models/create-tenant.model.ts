// Nombres de campo en snake_case a propósito: deben calzar tal cual con
// CreateTenantDTO (criterio de aceptación de la ficha T16).
export interface CreateTenantDto {
  name: string;
  slug: string;
  country_code: string;
  default_currency: string;
  default_timezone: string;
  locale: string;
  tax_id: string;
  legal_name: string;
  billing_email: string;
  billing_address: string;
  plan_id: string;
  trial_days: number;
  first_admin: {
    full_name: string;
    email: string;
    password: string;
  };
}
