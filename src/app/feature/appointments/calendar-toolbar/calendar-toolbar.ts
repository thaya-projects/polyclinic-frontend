import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Professional } from '../../../core/models/professional.model';
import { Branch } from '../../../core/models/branch.model';

@Component({
  selector: 'app-calendar-toolbar',
  imports: [],
  templateUrl: './calendar-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarToolbar {
  // Desacoplado de la fuente de datos: solo recibe las listas ya resueltas.
  professionals = input.required<Professional[]>();
  branches = input.required<Branch[]>();

  selectedProfessionalId = model('');
  selectedBranchId = model('');
  viewMode = model<'day' | 'week'>('week');
  referenceDate = model<Date>(new Date());

  readonly rangeLabel = computed(() => {
    const ref = this.referenceDate();
    if (this.viewMode() === 'day') {
      return ref.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
    const start = new Date(ref);
    start.setDate(ref.getDate() - ref.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  });

  setViewMode(mode: 'day' | 'week'): void {
    this.viewMode.set(mode);
  }

  goToday(): void {
    this.referenceDate.set(new Date());
  }

  goPrev(): void {
    this.shift(-1);
  }

  goNext(): void {
    this.shift(1);
  }

  private shift(direction: 1 | -1): void {
    const days = this.viewMode() === 'day' ? 1 : 7;
    const next = new Date(this.referenceDate());
    next.setDate(next.getDate() + direction * days);
    this.referenceDate.set(next);
  }

  selectProfessional(value: string): void {
    this.selectedProfessionalId.set(value);
  }

  selectBranch(value: string): void {
    this.selectedBranchId.set(value);
  }
}
