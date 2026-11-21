import { MaterialCategory } from '../models/material.model';

export const MATERIAL_CATEGORIES: MaterialCategory[] = ['material', 'medication', 'supply'];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  material: 'Material',
  medication: 'Medicamento',
  supply: 'Insumo',
};

export function materialCategoryLabel(value: MaterialCategory): string {
  return MATERIAL_CATEGORY_LABELS[value] ?? value;
}
