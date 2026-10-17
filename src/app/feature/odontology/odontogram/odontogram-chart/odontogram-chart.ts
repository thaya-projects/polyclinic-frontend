import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dentition, DentitionChart, dentitionCharts } from '../../../../core/models/odontogram.model';
import {
  ChartFace, OdontogramPaint, ToothSurface, faceForSurface, surfaceForFace,
} from '../../../../core/models/tooth-condition.model';

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

  chartLabel(chart: DentitionChart): string {
    return chart.kind === 'temporal' ? 'Dentición temporal' : 'Dentición permanente';
  }
}
