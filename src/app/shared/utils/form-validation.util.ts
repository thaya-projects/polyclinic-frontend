import { AbstractControl } from '@angular/forms';

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
  if (errors['min']) return `El valor mínimo es ${errors['min'].min}.`;
  return 'Valor inválido.';
}

export function fieldInputClass(control: AbstractControl | null): string {
  return isFieldInvalid(control)
    ? `${INPUT_BASE_CLASS} border-red-400 focus:border-red-400 focus:ring-red-400/18`
    : `${INPUT_BASE_CLASS} border-border focus:border-brand focus:ring-brand/18`;
}
