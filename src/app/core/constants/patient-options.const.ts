export interface PatientOption {
  value: string;
  label: string;
}

export const DOCUMENT_TYPES: PatientOption[] = [
  { value: 'dni', label: 'DNI' },
  { value: 'ce', label: 'Carné de extranjería' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'other', label: 'Otro' },
];

export const SEX_OPTIONS: PatientOption[] = [
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
];

export function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPES.find(o => o.value === value)?.label ?? value;
}

export function sexLabel(value: string): string {
  return SEX_OPTIONS.find(o => o.value === value)?.label ?? value;
}
