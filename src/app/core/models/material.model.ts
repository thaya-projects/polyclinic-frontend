// Tabla `material`: catálogo de materiales/insumos/medicamentos del tenant. code es opcional y
// único por tenant (409 si se repite). currency opcional: si se omite, el backend usa la del tenant.
export type MaterialCategory = 'material' | 'medication' | 'supply';

export interface Material {
  id: string;
  tenant_id: string;
  code: string | null;
  name: string;
  category: MaterialCategory;
  unit_of_measure_id: string;
  // Resueltos por el backend en la respuesta: no hace falta cruzarlos contra el catálogo de unidades.
  unit_of_measure_code: string | null;
  unit_of_measure_name: string;
  unit_cost: number;
  currency: string;
  min_stock: number;
  is_active: boolean;
}

export type CreateMaterialDto = Pick<Material, 'name' | 'category' | 'unit_of_measure_id' | 'unit_cost' | 'min_stock'> & {
  code?: string | null;
  currency?: string | null;
};

// PATCH: todos opcionales, incluido code/currency (a diferencia de Expense, acá sí se pueden cambiar).
export type UpdateMaterialDto = Partial<CreateMaterialDto> & Partial<Pick<Material, 'is_active'>>;

// GET /tenants/materials?page=&limit=&is_active=&category=
export interface MaterialsQuery {
  page: number;
  limit: number;
  is_active?: boolean;
  category?: MaterialCategory;
}
