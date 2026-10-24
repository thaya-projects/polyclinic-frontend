import { Dentition } from './odontogram.model';

// Fase 6 (Odontología): espeja ToothConditionDTO (snake_case). Una condición del catálogo dental
// marcada sobre una pieza (FDI) y, opcionalmente, una cara del odontograma. Sin tenant_id (no se
// expone); created_by lo fija el backend desde el token.
export type ToothSurface =
  | 'mesial' | 'distal' | 'oclusal' | 'incisal' | 'vestibular' | 'lingual' | 'palatino' | 'cervical' | 'whole';

export type ToothConditionState = 'existente' | 'planificado' | 'en_proceso' | 'realizado';

export interface ToothCondition {
  id: string;
  odontogram_id: string;
  tooth_fdi: number;
  surface: ToothSurface;
  condition_id: string;
  state: ToothConditionState;
  note: string | null;
  // ISO-8601 (UTC). Lo fija el backend al crear.
  created_at: string;
  created_by: string;
}

// Sin tenant_id ni created_by (token). surface ausente = whole; state ausente = existente.
export interface CreateToothConditionDto {
  tooth_fdi: number;
  surface?: ToothSurface;
  condition_id: string;
  state?: ToothConditionState;
  note?: string | null;
}

// PATCH tri-state: campo ausente = no tocar; note null = quitar la nota. tooth_fdi inmutable.
export interface UpdateToothConditionDto {
  surface?: ToothSurface;
  condition_id?: string;
  state?: ToothConditionState;
  note?: string | null;
}

export const DEFAULT_TOOTH_SURFACE: ToothSurface = 'whole';
export const DEFAULT_TOOTH_CONDITION_STATE: ToothConditionState = 'existente';

export const TOOTH_SURFACE_OPTIONS: readonly { value: ToothSurface; label: string }[] = [
  { value: 'whole', label: 'Pieza completa' },
  { value: 'oclusal', label: 'Oclusal' },
  { value: 'incisal', label: 'Incisal' },
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
  { value: 'vestibular', label: 'Vestibular' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'palatino', label: 'Palatino' },
  { value: 'cervical', label: 'Cervical' },
];

export const TOOTH_CONDITION_STATE_OPTIONS: readonly { value: ToothConditionState; label: string }[] = [
  { value: 'existente', label: 'Existente' },
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'realizado', label: 'Realizado' },
];

export const TOOTH_SURFACES: readonly ToothSurface[] = TOOTH_SURFACE_OPTIONS.map(o => o.value);
export const TOOTH_CONDITION_STATES: readonly ToothConditionState[] = TOOTH_CONDITION_STATE_OPTIONS.map(o => o.value);

export function toothSurfaceLabel(surface: ToothSurface): string {
  return TOOTH_SURFACE_OPTIONS.find(o => o.value === surface)?.label ?? surface;
}

export function toothConditionStateLabel(state: ToothConditionState): string {
  return TOOTH_CONDITION_STATE_OPTIONS.find(o => o.value === state)?.label ?? state;
}

// ── FDI válidos por dentición (misma regla que el backend) ─────────────────────────────────────
// Permanente 11-18, 21-28, 31-38, 41-48; temporal 51-55, 61-65, 71-75, 81-85; mixta ambas.
const PERMANENT_QUADRANTS = [1, 2, 3, 4];
const TEMPORARY_QUADRANTS = [5, 6, 7, 8];

function isPermanentFdi(fdi: number): boolean {
  const q = Math.floor(fdi / 10);
  const position = fdi % 10;
  return PERMANENT_QUADRANTS.includes(q) && position >= 1 && position <= 8;
}

function isTemporaryFdi(fdi: number): boolean {
  const q = Math.floor(fdi / 10);
  const position = fdi % 10;
  return TEMPORARY_QUADRANTS.includes(q) && position >= 1 && position <= 5;
}

export function isValidFdiForDentition(fdi: number, dentition: Dentition): boolean {
  if (!Number.isInteger(fdi)) return false;
  switch (dentition) {
    case 'permanente': return isPermanentFdi(fdi);
    case 'temporal': return isTemporaryFdi(fdi);
    case 'mixta': return isPermanentFdi(fdi) || isTemporaryFdi(fdi);
    default: return false;
  }
}

// ── Pintado de la grilla ───────────────────────────────────────────────────────────────────────
// La grilla dibuja 5 caras por pieza (arriba, derecha, abajo, izquierda, centro). Qué cara clínica es
// cada polígono depende de la arcada y del lado de la pantalla:
//   - arriba/abajo: vestibular hacia afuera de la boca; palatino (superior) / lingual (inferior) adentro.
//   - izquierda/derecha: mesial hacia la línea media; distal hacia afuera.
//   - centro: incisal en incisivos y caninos (posiciones 1-3), oclusal en premolares y molares.
// cervical no tiene polígono: se pinta como contorno de la pieza. whole pinta las 5 caras.
export type ChartFace = 'top' | 'right' | 'bottom' | 'left' | 'center';

export const CHART_FACES: readonly ChartFace[] = ['top', 'right', 'bottom', 'left', 'center'];

function isUpperFdi(fdi: number): boolean {
  return [1, 2, 5, 6].includes(Math.floor(fdi / 10));
}

// Cuadrantes que se dibujan en la mitad izquierda de la pantalla (lado derecho del paciente).
function isScreenLeftFdi(fdi: number): boolean {
  return [1, 4, 5, 8].includes(Math.floor(fdi / 10));
}

function isAnteriorFdi(fdi: number): boolean {
  return fdi % 10 <= 3;
}

export function surfaceForFace(fdi: number, face: ChartFace): ToothSurface {
  const upper = isUpperFdi(fdi);
  const screenLeft = isScreenLeftFdi(fdi);
  switch (face) {
    case 'top': return upper ? 'vestibular' : 'lingual';
    case 'bottom': return upper ? 'palatino' : 'vestibular';
    case 'left': return screenLeft ? 'distal' : 'mesial';
    case 'right': return screenLeft ? 'mesial' : 'distal';
    default: return isAnteriorFdi(fdi) ? 'incisal' : 'oclusal';
  }
}

// Inversa de surfaceForFace. null = whole/cervical (no son una cara del dibujo). lingual y palatino
// apuntan ambos a la cara interna; oclusal e incisal ambos al centro.
export function faceForSurface(fdi: number, surface: ToothSurface): ChartFace | null {
  const upper = isUpperFdi(fdi);
  const screenLeft = isScreenLeftFdi(fdi);
  switch (surface) {
    case 'vestibular': return upper ? 'top' : 'bottom';
    case 'lingual':
    case 'palatino': return upper ? 'bottom' : 'top';
    case 'mesial': return screenLeft ? 'right' : 'left';
    case 'distal': return screenLeft ? 'left' : 'right';
    case 'oclusal':
    case 'incisal': return 'center';
    default: return null;
  }
}

// Colores a pintar por pieza: whole (fondo de las 5 caras), cervical (contorno) y caras puntuales,
// que se dibujan encima de whole.
export interface ToothPaint {
  whole?: string;
  cervical?: string;
  faces: Partial<Record<ChartFace, string>>;
}

export type OdontogramPaint = Record<number, ToothPaint>;

// Color neutro para condiciones sin default_color o que ya no están en el catálogo.
export const TOOTH_CONDITION_FALLBACK_COLOR = '#9E9E9E';

// Arma el pintado a partir de las condiciones marcadas y del color de cada condición del catálogo.
// Si varias condiciones caen en la misma cara gana la más reciente (created_at).
export function buildOdontogramPaint(
  items: readonly ToothCondition[],
  colorOf: (conditionId: string) => string | null | undefined,
): OdontogramPaint {
  const paint: OdontogramPaint = {};
  const ordered = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const item of ordered) {
    const color = colorOf(item.condition_id) || TOOTH_CONDITION_FALLBACK_COLOR;
    const tooth = (paint[item.tooth_fdi] ??= { faces: {} });
    if (item.surface === 'whole') tooth.whole = color;
    else if (item.surface === 'cervical') tooth.cervical = color;
    else {
      const face = faceForSurface(item.tooth_fdi, item.surface);
      if (face) tooth.faces[face] = color;
    }
  }
  return paint;
}
