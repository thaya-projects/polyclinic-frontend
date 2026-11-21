import { ScheduleBlock, ScheduleException } from '../../core/models/schedule.model';

export interface BusyInterval {
  start: Date;
  end: Date;
}

function atTime(date: Date, hhmmss: string): Date {
  const [h, m, s] = hhmmss.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, s ?? 0, 0);
  return d;
}

function overlapsAny(start: Date, end: Date, intervals: BusyInterval[]): boolean {
  return intervals.some(iv => start < iv.end && end > iv.start);
}

// Cruza el horario laboral del profesional (bloques por día de semana) con
// sus excepciones y las citas ya agendadas para armar los huecos libres.
export function computeFreeSlots(params: {
  date: Date;
  durationMinutes: number;
  blocks: ScheduleBlock[];
  exceptions: ScheduleException[];
  busy: BusyInterval[];
  now?: Date;
}): Date[] {
  const { date, durationMinutes, blocks, exceptions, busy } = params;
  const now = params.now ?? new Date();
  const blockers = exceptions.map(e => ({ start: new Date(e.starts_at), end: new Date(e.ends_at) }));
  const durationMs = durationMinutes * 60000;

  const slots: Date[] = [];
  for (const block of blocks.filter(b => b.weekday === date.getDay())) {
    const blockStart = atTime(date, block.start_time).getTime();
    const blockEnd = atTime(date, block.end_time).getTime();
    const step = Math.max(block.slot_minutes, 1) * 60000;

    for (let t = blockStart; t + durationMs <= blockEnd; t += step) {
      const start = new Date(t);
      const end = new Date(t + durationMs);
      if (start < now) continue;
      if (overlapsAny(start, end, blockers) || overlapsAny(start, end, busy)) continue;
      slots.push(start);
    }
  }

  const seen = new Set<number>();
  return slots
    .filter(d => (seen.has(d.getTime()) ? false : (seen.add(d.getTime()), true)))
    .sort((a, b) => a.getTime() - b.getTime());
}
