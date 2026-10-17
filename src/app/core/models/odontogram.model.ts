// Fase 6 (Odontología): espeja OdontogramDTO (snake_case). Sin tenant_id (no se expone). Un paciente
// tiene a lo sumo un odontograma current (is_current); crear uno nuevo deja el anterior como snapshot
// histórico (is_current = false) con su snapshot_date original.
export type Dentition = 'permanente' | 'temporal' | 'mixta';

export interface Odontogram {
  id: string;
  clinical_record_id: string;
  patient_id: string;
  encounter_id: string | null;
  dentition: Dentition;
  is_current: boolean;
  // ISO-8601 (UTC). Lo fija el backend al crear.
  snapshot_date: string;
}

// Sin tenant_id (token), patient_id (ruta), is_current ni snapshot_date (server-side). dentition
// ausente = permanente.
export interface CreateOdontogramDto {
  clinical_record_id: string;
  encounter_id?: string | null;
  dentition?: Dentition;
}

// Para el encabezado y el selector de paciente de la pantalla.
export interface OdontogramPatientOption {
  id: string;
  // Nombre a secas (encabezado) y texto completo (nombre + documento) para el selector.
  name: string;
  label: string;
}

export const DENTITION_OPTIONS: readonly { value: Dentition; label: string }[] = [
  { value: 'permanente', label: 'Permanente' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'mixta', label: 'Mixta' },
];

export function dentitionLabel(dentition: Dentition): string {
  return DENTITION_OPTIONS.find(o => o.value === dentition)?.label ?? dentition;
}

// ── Numeración FDI ─────────────────────────────────────────────────────────────────────────────
// Cuadrantes 1-4 permanentes (8 piezas), 5-8 temporales (5 piezas). Cada fila se arma en el orden
// en que se ve de frente al paciente: derecha del paciente a la izquierda de la pantalla.
export interface ToothArch {
  // Mitad izquierda de la pantalla (lado derecho del paciente) y mitad derecha.
  left: number[];
  right: number[];
}

export interface DentitionChart {
  kind: 'permanente' | 'temporal';
  upper: ToothArch;
  lower: ToothArch;
}

function quadrant(q: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => q * 10 + i + 1);
}

const PERMANENT_CHART: DentitionChart = {
  kind: 'permanente',
  upper: { left: quadrant(1, 8).reverse(), right: quadrant(2, 8) },
  lower: { left: quadrant(4, 8).reverse(), right: quadrant(3, 8) },
};

const TEMPORARY_CHART: DentitionChart = {
  kind: 'temporal',
  upper: { left: quadrant(5, 5).reverse(), right: quadrant(6, 5) },
  lower: { left: quadrant(8, 5).reverse(), right: quadrant(7, 5) },
};

// Mixta muestra ambas grillas (permanente arriba, temporal abajo).
export function dentitionCharts(dentition: Dentition): DentitionChart[] {
  switch (dentition) {
    case 'temporal': return [TEMPORARY_CHART];
    case 'mixta': return [PERMANENT_CHART, TEMPORARY_CHART];
    default: return [PERMANENT_CHART];
  }
}

const QUADRANT_LABELS = ['Superior derecho', 'Superior izquierdo', 'Inferior izquierdo', 'Inferior derecho'];
const PERMANENT_NAMES = [
  'Incisivo central', 'Incisivo lateral', 'Canino', 'Primer premolar', 'Segundo premolar',
  'Primer molar', 'Segundo molar', 'Tercer molar',
];
const TEMPORARY_NAMES = ['Incisivo central', 'Incisivo lateral', 'Canino', 'Primer molar', 'Segundo molar'];

export interface ToothInfo {
  fdi: number;
  name: string;
  quadrant: string;
  temporary: boolean;
}

// Descripción de la pieza para el panel de selección (solo presentación).
export function toothInfo(fdi: number): ToothInfo {
  const q = Math.floor(fdi / 10);
  const position = fdi % 10;
  const temporary = q >= 5;
  const names = temporary ? TEMPORARY_NAMES : PERMANENT_NAMES;
  return {
    fdi,
    name: names[position - 1] ?? `Pieza ${fdi}`,
    quadrant: QUADRANT_LABELS[(temporary ? q - 4 : q) - 1] ?? '',
    temporary,
  };
}
