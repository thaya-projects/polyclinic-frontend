// Hábitos de la historia clínica (clinical_record.habits, jsonb clave/valor). Claves fijas para que
// el dato sea consultable; `options` vacío = texto libre.
export interface HabitField {
  key: string;
  label: string;
  options: string[];
  placeholder?: string;
}

export const HABIT_FIELDS: HabitField[] = [
  { key: 'tabaco', label: 'Tabaco', options: ['No fuma', 'Ex fumador', 'Ocasional', 'Diario'] },
  { key: 'alcohol', label: 'Alcohol', options: ['No consume', 'Ocasional', 'Semanal', 'Diario'] },
  { key: 'actividad_fisica', label: 'Actividad física', options: ['Sedentario', 'Ocasional', '1-3 veces/semana', 'Más de 3 veces/semana'] },
  { key: 'alimentacion', label: 'Alimentación', options: [], placeholder: 'Ej. vegetariana, baja en sal' },
  { key: 'sueno', label: 'Sueño', options: [], placeholder: 'Ej. 7 h, insomnio ocasional' },
  { key: 'otros', label: 'Otros', options: [], placeholder: 'Otros hábitos relevantes' },
];
