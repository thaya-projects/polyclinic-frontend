// Espeja ScheduleBlockDTO (snake_case). Weekday ISO: 0=domingo, 6=sábado.
// time serializado como "HH:mm:ss" por default de System.Text.Json con TimeOnly.
export interface ScheduleBlock {
  id: string;
  branch_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface ScheduleBlockInput {
  branch_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface ReplaceScheduleDto {
  items: ScheduleBlockInput[];
}

export interface ScheduleException {
  id: string;
  professional_id: string | null;
  branch_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface CreateScheduleExceptionDto {
  professional_id: string | null;
  branch_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

// Labels de días en español (índice = weekday ISO del backend).
export const WEEKDAY_LABELS: readonly string[] = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];
