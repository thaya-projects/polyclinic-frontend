export interface PatientOption {
  value: string;
  label: string;
}

// document_type es texto libre para el backend, sin enum.
export const DOCUMENT_TYPES: PatientOption[] = [
  { value: 'CI', label: 'Cédula de identidad' },
  { value: 'dni', label: 'DNI' },
  { value: 'ce', label: 'Carné de extranjería' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'other', label: 'Otro' },
];

// El backend solo acepta "m" | "f" | "x".
export const SEX_OPTIONS: PatientOption[] = [
  { value: 'm', label: 'Masculino' },
  { value: 'f', label: 'Femenino' },
  { value: 'x', label: 'Otro' },
];

export function documentTypeLabel(value: string | null): string {
  if (!value) return '';
  return DOCUMENT_TYPES.find(o => o.value === value)?.label ?? value;
}

export function sexLabel(value: string | null): string {
  if (!value) return '';
  return SEX_OPTIONS.find(o => o.value === value)?.label ?? value;
}
