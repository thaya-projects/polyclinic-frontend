// Catálogo chico por tenant (sin paginar). code opcional y único (409 si se repite).
// is_active "retira" la unidad del selector sin borrarla — no hay DELETE.
export interface UnitOfMeasure {
  id: string;
  tenant_id: string;
  code: string | null;
  name: string;
  is_active: boolean;
}

export type CreateUnitOfMeasureDto = {
  name: string;
  code?: string | null;
};

// PATCH: los 3 campos opcionales.
export type UpdateUnitOfMeasureDto = Partial<CreateUnitOfMeasureDto> & Partial<Pick<UnitOfMeasure, 'is_active'>>;
