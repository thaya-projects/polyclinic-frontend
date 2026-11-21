import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dentition, DentitionChart, dentitionCharts } from '../../../../core/models/odontogram.model';
import {
  ChartFace, OdontogramPaint, ToothSurface, faceForSurface, surfaceForFace,
} from '../../../../core/models/tooth-condition.model';

type ToothShape = 'central' | 'lateral' | 'canine' | 'premolar' | 'molar';

interface ToothShapeDef {
  // Ancho relativo de la columna (y del viewBox): molar > premolar > canino/central > lateral.
  width: number;
  viewBox: string;
  roots: string[];
  crown: string;
  // Línea amelocementaria, ajustada al ancho de la corona (no sobresale de la pieza).
  cej: string;
}

// Silueta anatómica en vista vestibular, para la arcada superior: raíz arriba (y 0–44), línea
// amelocementaria en y=44 y corona abajo (y 44–76). La inferior se dibuja espejada.
const INCISOR_ROOT = 'M10 44 C12 28 16 10 20 2 C24 10 28 28 30 44 Z';
const INCISOR_CROWN = 'M9 44 C6 56 7 68 11 74 Q20 77 29 74 C33 68 34 56 31 44 Z';
const INCISOR_CEJ = 'M9 44 Q20 47 31 44';
const TOOTH_SHAPES: Record<ToothShape, ToothShapeDef> = {
  central: { width: 40, viewBox: '0 0 40 76', roots: [INCISOR_ROOT], crown: INCISOR_CROWN, cej: INCISOR_CEJ },
  lateral: { width: 36, viewBox: '2 0 36 76', roots: [INCISOR_ROOT], crown: INCISOR_CROWN, cej: INCISOR_CEJ },
  canine: {
    width: 40, viewBox: '0 0 40 76',
    roots: ['M10 44 C11 26 15 6 20 0 C25 6 29 26 30 44 Z'],
    crown: 'M9 44 C6 56 10 66 20 76 C30 66 34 56 31 44 Z',
    cej: INCISOR_CEJ,
  },
  premolar: {
    width: 42, viewBox: '-1 0 42 76',
    roots: ['M11 44 C12 28 16 8 20 2 C24 8 28 28 29 44 Z'],
    crown: 'M7 44 C5 56 7 66 12 72 L20 75 L28 72 C33 66 35 56 33 44 Z',
    cej: 'M7 44 Q20 47 33 44',
  },
  molar: {
    width: 52, viewBox: '0 0 52 76',
    roots: ['M6 44 C6 30 8 16 12 6 C18 14 22 30 24 44 Z', 'M28 44 C30 30 34 14 40 6 C44 16 46 30 46 44 Z'],
    crown: 'M5 44 C3 56 4 66 9 73 Q16 77 19 72 Q26 77 33 72 Q36 77 43 73 C48 66 49 56 47 44 Z',
    cej: 'M5 44 Q26 48 47 44',
  },
};

// Posición dentro del cuadrante (fdi % 10) → forma. Temporales (cuadrantes 5–8): 4 y 5 son molares.
function shapeFor(fdi: number): ToothShape {
  const position = fdi % 10;
  const temporary = Math.floor(fdi / 10) >= 5;
  if (position === 1) return 'central';
  if (position === 2) return 'lateral';
  if (position === 3) return 'canine';
  if (temporary || position >= 6) return 'molar';
  return 'premolar';
}

// Columnas del mismo ancho: el protagonista es el bloque de 5 caras (donde se anota), no el dibujo.
// Tope de ancho por columna para que en pantallas grandes no se estire de más.
const MAX_COLUMN_PX = 76;
const MIN_COLUMN_PX = 36;
// px-4 del canvas a cada lado.
const CANVAS_PADDING_PX = 32;
// La silueta del molar (la más ancha) ocupa esta fracción de la columna; las demás, en proporción, así
// todas quedan a la misma altura.
const SILHOUETTE_MAX_PCT = 70;
const WIDEST_SHAPE = TOOTH_SHAPES.molar.width;

export interface ToothFaceSelection {
  fdi: number;
  surface: ToothSurface;
}

// Presentacional: grilla FDI del odontograma. No conoce la fuente de datos ni el paciente — recibe la
// dentición, la pieza / cara seleccionadas y el pintado de las condiciones marcadas (`paint`, color
// por pieza y cara), y emite la pieza (click en la pieza / teclado) o la cara (click en una cara) que
// el usuario elige.
// Permanente: 18-11 | 21-28 arriba, 48-41 | 31-38 abajo. Temporal: 55-51 | 61-65, 85-81 | 71-75.
// Mixta: ambas grillas. Cada pieza dibuja sus 5 caras (vestibular, lingual/palatina, mesial, distal y
// oclusal/incisal; ver surfaceForFace); whole pinta las 5 y cervical el contorno.
@Component({
  selector: 'app-odontogram-chart',
  imports: [NgTemplateOutlet],
  templateUrl: './odontogram-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OdontogramChart {
  dentition = input.required<Dentition>();
  selectedTooth = input<number | null>(null);
  selectedSurface = input<ToothSurface | null>(null);
  paint = input<OdontogramPaint>({});

  toothSelected = output<number>();
  faceSelected = output<ToothFaceSelection>();

  readonly charts = computed<DentitionChart[]>(() => dentitionCharts(this.dentition()));

  shape(fdi: number): ToothShapeDef {
    return TOOTH_SHAPES[shapeFor(fdi)];
  }

  // Ancho de la silueta dentro de su columna: proporcional al tipo de pieza (molar > incisivo).
  silhouetteWidthPct(fdi: number): number {
    return (this.shape(fdi).width / WIDEST_SHAPE) * SILHOUETTE_MAX_PCT;
  }

  private columns(chart: DentitionChart): number {
    return chart.upper.left.length + chart.upper.right.length;
  }

  // Fracción del ancho disponible según las columnas de la dentición más ancha que se muestra: en mixta
  // las piezas temporales miden lo mismo que las permanentes (no se estiran para llenar el ancho).
  chartWidth(chart: DentitionChart): string {
    const widest = Math.max(...this.charts().map(c => this.columns(c)));
    return `calc((100% - ${CANVAS_PADDING_PX}px) * ${this.columns(chart) / widest} + ${CANVAS_PADDING_PX}px)`;
  }

  chartMaxWidth(chart: DentitionChart): number {
    return this.columns(chart) * MAX_COLUMN_PX + CANVAS_PADDING_PX;
  }

  chartMinWidth(chart: DentitionChart): number {
    return this.columns(chart) * MIN_COLUMN_PX + CANVAS_PADDING_PX;
  }

  // Cara resaltada (la elegida en la pieza seleccionada).
  private readonly selectedFace = computed<ChartFace | null>(() => {
    const fdi = this.selectedTooth();
    const surface = this.selectedSurface();
    return fdi === null || surface === null ? null : faceForSurface(fdi, surface);
  });

  select(fdi: number): void {
    this.toothSelected.emit(fdi);
  }

  selectFace(event: Event, fdi: number, face: ChartFace): void {
    // La cara está dentro del botón de la pieza: sin esto también se emitiría toothSelected.
    event.stopPropagation();
    this.faceSelected.emit({ fdi, surface: surfaceForFace(fdi, face) });
  }

  faceFill(fdi: number, face: ChartFace): string {
    const tooth = this.paint()[fdi];
    return tooth?.faces[face] ?? tooth?.whole ?? 'none';
  }

  faceStroke(fdi: number, face: ChartFace): number {
    return this.selectedTooth() === fdi && this.selectedFace() === face ? 3 : 1.5;
  }

  faceStrokeColor(fdi: number, face: ChartFace): string | null {
    return this.selectedTooth() === fdi && this.selectedFace() === face ? 'var(--color-brand)' : null;
  }

  chartLabel(chart: DentitionChart): string {
    return chart.kind === 'temporary' ? 'Dentición temporal' : 'Dentición permanente';
  }
}
