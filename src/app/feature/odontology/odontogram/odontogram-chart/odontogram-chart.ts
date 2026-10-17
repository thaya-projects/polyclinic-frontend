import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Dentition, DentitionChart, dentitionCharts } from '../../../../core/models/odontogram.model';

// Presentacional: grilla FDI del odontograma. No conoce la fuente de datos ni el paciente — recibe la
// dentición y la pieza seleccionada, y emite la pieza que el usuario elige (click / teclado).
// Permanente: 18-11 | 21-28 arriba, 48-41 | 31-38 abajo. Temporal: 55-51 | 61-65, 85-81 | 71-75.
// Mixta: ambas grillas. Cada pieza dibuja sus 5 caras (vestibular, lingual/palatina, mesial, distal y
// oclusal) sin estado todavía: ahí se pintarán las condiciones del catálogo.
@Component({
  selector: 'app-odontogram-chart',
  imports: [NgTemplateOutlet],
  templateUrl: './odontogram-chart.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OdontogramChart {
  dentition = input.required<Dentition>();
  selectedTooth = input<number | null>(null);

  toothSelected = output<number>();

  readonly charts = computed<DentitionChart[]>(() => dentitionCharts(this.dentition()));

  select(fdi: number): void {
    this.toothSelected.emit(fdi);
  }

  chartLabel(chart: DentitionChart): string {
    return chart.kind === 'temporal' ? 'Dentición temporal' : 'Dentición permanente';
  }
}
