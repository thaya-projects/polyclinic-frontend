import { AbstractControl, ValidationErrors } from '@angular/forms';

export const INPUT_BASE_CLASS =
  'h-11 rounded-xl border bg-surface px-3.5 text-sm text-text placeholder:text-muted focus:ring-3 focus:outline-none';

export function isFieldInvalid(control: AbstractControl | null): boolean {
  return !!control && control.invalid && (control.touched || control.dirty);
}

export function fieldErrorMessage(control: AbstractControl | null): string {
  const errors = control?.errors;
  if (!errors) return '';
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['email']) return 'Ingresa un correo válido.';
  if (errors['pattern']) return 'Solo minúsculas, números y guiones (ej: mi-clinica).';
  if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  if (errors['min']) return `El valor mínimo es ${errors['min'].min}.`;
  if (errors['futureDate']) return 'La fecha no puede ser futura.';
  if (errors['requiredWithDocumentNumber']) return 'Si ingresás un número de documento, el tipo es obligatorio.';
  if (errors['requiredForLogin']) return 'El correo es obligatorio para crear una cuenta de acceso.';
  return 'Valor inválido.';
}

// Un valor de solo espacios pasa Validators.required; esto no.
export function requiredNotBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

export function notFutureDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const limit = new Date();
  limit.setDate(limit.getDate() + 1);
  return date.getTime() > limit.getTime() ? { futureDate: true } : null;
}

export function fieldInputClass(control: AbstractControl | null): string {
  return isFieldInvalid(control)
    ? `${INPUT_BASE_CLASS} border-red-400 focus:border-red-400 focus:ring-red-400/18`
    : `${INPUT_BASE_CLASS} border-border focus:border-brand focus:ring-brand/18`;
}
