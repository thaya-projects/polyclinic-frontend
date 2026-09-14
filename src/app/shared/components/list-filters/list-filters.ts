import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, input, model, signal } from '@angular/core';
import { StatusChip } from '../status-chip/status-chip';
import { ListFilterConfig } from './list-filter.model';

const SEARCH_DEBOUNCE_MS = 280;

// Barra de búsqueda + filtros por dropdown, genérica y reutilizable en
// cualquier listado (tenants, usuarios, pacientes, etc.) — el consumidor
// solo declara qué filtros necesita vía `filters`.
@Component({
  selector: 'app-list-filters',
  imports: [StatusChip],
  templateUrl: './list-filters.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListFilters {
  private elementRef = inject(ElementRef<HTMLElement>);

  searchPlaceholder = input('Buscar...');
  filters = input<ListFilterConfig[]>([]);

  search = model('');
  values = model<Record<string, string>>({});

  // El input se ve responder al instante; el modelo `search` (el que
  // realmente filtra la lista) se actualiza recién tras el debounce.
  rawSearch = signal('');
  private searchDebounce?: ReturnType<typeof setTimeout>;

  openFilterKey = signal<string | null>(null);

  activeChips = computed(() => {
    const values = this.values();
    return this.filters()
      .filter(f => !!values[f.key])
      .map(f => ({
        key: f.key,
        label: f.options.find(o => o.value === values[f.key])?.label ?? values[f.key],
      }));
  });

  constructor() {
    // Mantiene el input sincronizado si `search` cambia desde afuera (ej. "Limpiar filtros").
    effect(() => this.rawSearch.set(this.search()));
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.openFilterKey.set(null);
    }
  }

  onSearchInput(value: string): void {
    this.rawSearch.set(value);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.search.set(value), SEARCH_DEBOUNCE_MS);
  }

  toggleFilter(key: string): void {
    this.openFilterKey.update(current => (current === key ? null : key));
  }

  selectOption(key: string, value: string): void {
    this.values.update(v => ({ ...v, [key]: value }));
    this.openFilterKey.set(null);
  }

  clearFilter(key: string): void {
    this.values.update(v => {
      const next = { ...v };
      delete next[key];
      return next;
    });
  }

  clearAll(): void {
    this.values.set({});
    this.search.set('');
    clearTimeout(this.searchDebounce);
  }

  valueFor(key: string): string {
    return this.values()[key] ?? '';
  }

  selectedLabel(filter: ListFilterConfig): string {
    const current = this.valueFor(filter.key);
    if (!current) return filter.label;
    return filter.options.find(o => o.value === current)?.label ?? filter.label;
  }
}
