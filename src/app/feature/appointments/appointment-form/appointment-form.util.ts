import { AbstractControl, ValidationErrors } from '@angular/forms';

// Precarga al crear una cita desde un atajo (ej. click en una celda libre del calendario).
// starts_at es una hora "candidata" (la celda clickeada) — se autoselecciona en el
// picker de horarios SOLO si de verdad figura entre los huecos libres calculados.
export interface AppointmentPrefill {
  date?: string;
  professional_id?: string;
  branch_id?: string;
  starts_at?: string;
}

// Duraciones típicas de un turno — "Personalizada" revela un input de minutos.
export const DURATION_PRESETS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h' },
  { value: 90, label: '1 h 30 min' },
  { value: 120, label: '2 h' },
];
export const PRESET_MINUTES = DURATION_PRESETS.map(p => p.value);

export function presetFor(minutes: number): string {
  return PRESET_MINUTES.includes(minutes) ? String(minutes) : 'custom';
}

export function diffMinutes(startsIso: string, endsIso: string): number {
  return Math.round((new Date(endsIso).getTime() - new Date(startsIso).getTime()) / 60000);
}

// Fin obligatorio solo cuando la duración es "Personalizada" (sino sale del preset elegido).
export function durationValidator(group: AbstractControl): ValidationErrors | null {
  const customCtrl = group.get('durationCustomMinutes');
  if (!customCtrl) return null;
  const isCustom = group.get('durationPreset')?.value === 'custom';
  const otherErrors = { ...customCtrl.errors };
  delete otherErrors['required'];
  if (isCustom && !(Number(customCtrl.value) > 0)) otherErrors['required'] = true;
  customCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  return null;
}

// <input type="date"> trabaja en hora local, sin horario ("2026-10-05") —
// el backend espera/devuelve ISO completo.
export function toDateOnly(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
