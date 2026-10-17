// Fase 6 (Odontología): espeja DentalConditionDTO (snake_case). tenant_id null = condición global de
// plataforma (visible para todos, no editable); no-null = propia del tenant.
export interface DentalCondition {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  category: string | null;
  default_color: string | null;
}

// Sin tenant_id: el backend lo toma del token.
export interface CreateDentalConditionDto {
  code: string;
  name: string;
  category?: string | null;
  default_color?: string | null;
}

// PATCH tri-state: campo ausente = no tocar; null en category/default_color = quitar el valor.
// name no admite null. Code inmutable.
export interface UpdateDentalConditionDto {
  name?: string;
  category?: string | null;
  default_color?: string | null;
}

// Reglas de DentalConditionCode y HexColor del backend.
export const DENTAL_CONDITION_LIMITS = {
  codeMaxLength: 50,
  codeFormat: /^[a-z0-9_]+$/,
  colorFormat: /^#[0-9A-Fa-f]{6}$/,
} as const;

// Categorías del seed de globales (DentalConditionSeeder). Solo sugerencias: el backend acepta texto libre.
export const DENTAL_CONDITION_CATEGORIES = ['patologia', 'restauracion', 'estado', 'tratamiento'] as const;

export function isGlobalDentalCondition(condition: DentalCondition): boolean {
  return condition.tenant_id === null;
}
