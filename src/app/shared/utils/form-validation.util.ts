import { AbstractControl, ValidationErrors } from '@angular/forms';
import { splitE164 } from '../../core/constants/phone-countries.const';

export const INPUT_BASE_CLASS =
  'h-11 rounded-xl border bg-surface px-3.5 text-sm text-text placeholder:text-muted focus:ring-3 focus:outline-none';

export function isFieldInvalid(control: AbstractControl | null): boolean {
  return !!control && control.invalid && (control.touched || control.dirty);
}

export function fieldErrorMessage(control: AbstractControl | null): string {
  const errors = control?.errors;
  if (!errors) return '';
  // Error del backend para este campo (applyServerError): ya viene traducido.
  if (typeof errors['server'] === 'string') return errors['server'];
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['email']) return 'Ingresá un correo válido (ej. nombre@dominio.com).';
  if (errors['phone']) return 'Ingresá un número válido para el país seleccionado.';
  if (errors['max']) return `El valor máximo es ${errors['max'].max}.`;
  if (errors['pattern']) return patternErrorMessage(String(errors['pattern'].requiredPattern ?? ''));
  if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
  if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
  if (errors['min']) return `El valor mínimo es ${errors['min'].min}.`;
  if (errors['futureDate']) return 'La fecha no puede ser futura.';
  if (errors['requiredWithDocumentNumber']) return 'Si ingresás un número de documento, el tipo es obligatorio.';
  if (errors['requiredForLogin']) return 'El correo es obligatorio para crear una cuenta de acceso.';
  return 'Valor inválido.';
}

// El motivo según el patrón que no se cumplió (slug/código, moneda, entero), nunca uno fijo.
function patternErrorMessage(pattern: string): string {
  if (pattern.includes('[A-Za-z]{3}')) return 'Usá un código de 3 letras (ej. BOB, USD).';
  if (pattern.includes('a-z0-9]+(?:-')) return 'Solo minúsculas, números y guiones (ej: mi-clinica).';
  if (pattern.includes('a-z0-9_]')) return 'Solo minúsculas, números y guion bajo (ej: medicina_general).';
  if (pattern === '/^\\d+$/' || pattern === '^\\d+$') return 'Ingresá un número entero.';
  return 'El formato no es válido.';
}

// Mismo criterio que el VO Email del backend (Validators.email de Angular acepta "x@y", que el
// backend rechaza con 422): algo@dominio.tld, sin espacios. Vacío = válido (usar required aparte).
export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? null : { email: true };
}

// Teléfono E.164 (lo que arma <app-phone-input>), con la cantidad de dígitos del país cuando se
// conoce. Vacío = válido.
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) return null;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) return { phone: true };
  const parts = splitE164(value);
  if (parts && (parts.national.length < parts.country.min || parts.national.length > parts.country.max)) {
    return { phone: true };
  }
  return null;
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
