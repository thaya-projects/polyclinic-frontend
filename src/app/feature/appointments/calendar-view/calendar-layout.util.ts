import { Appointment } from '../../../core/models/appointment.model';

export interface PositionedCard {
  appt: Appointment;
  top: number;
  height: number;
  left: string;
  width: string;
}

const MIN_VISIBLE_MINUTES = 40;
const CARD_GAP_PX = 3;

interface LayoutItem {
  appt: Appointment;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

// Asigna carriles (como Google Calendar) a las citas que se superponen en el tiempo,
// agrupadas por "clusters" transitivos — cada cluster reparte el ancho entre sus carriles.
function assignLanes(items: LayoutItem[]): void {
  let cluster: LayoutItem[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const lanesEnd: number[] = [];
    for (const it of cluster) {
      let lane = lanesEnd.findIndex(end => end <= it.start);
      if (lane === -1) {
        lane = lanesEnd.length;
        lanesEnd.push(it.end);
      } else {
        lanesEnd[lane] = it.end;
      }
      it.lane = lane;
    }
    for (const it of cluster) it.lanes = lanesEnd.length;
    cluster = [];
  };

  for (const it of items) {
    if (it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
}

// Posiciona las citas de un día por su hora/duración real (no por fila fija), con
// carriles lado a lado cuando se superponen.
export function computeDayLayout(
  dayAppointments: Appointment[],
  day: Date,
  startHour: number,
  endHour: number,
  rowHeightPx: number,
): PositionedCard[] {
  const dayStartMs = new Date(day).setHours(startHour, 0, 0, 0);
  const totalMinutes = (endHour - startHour) * 60;
  const pxPerMin = rowHeightPx / 60;

  const items: LayoutItem[] = dayAppointments
    .map(appt => {
      const start = Math.max(0, (new Date(appt.starts_at).getTime() - dayStartMs) / 60000);
      const rawEnd = (new Date(appt.ends_at).getTime() - dayStartMs) / 60000;
      const end = Math.min(totalMinutes, Math.max(rawEnd, start + MIN_VISIBLE_MINUTES));
      return { appt, start, end, lane: 0, lanes: 1 };
    })
    .filter(it => it.end > 0 && it.start < totalMinutes)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  assignLanes(items);

  return items.map(it => ({
    appt: it.appt,
    top: it.start * pxPerMin,
    height: Math.max(0, (it.end - it.start) * pxPerMin - CARD_GAP_PX),
    left: `calc(${(it.lane / it.lanes) * 100}% + ${it.lane === 0 ? 0 : 2}px)`,
    width: `calc(${(1 / it.lanes) * 100}% - ${it.lanes === 1 ? 0 : 4}px)`,
  }));
}
