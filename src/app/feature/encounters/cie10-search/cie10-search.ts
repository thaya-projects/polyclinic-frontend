import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, map, of, startWith, switchMap } from 'rxjs';
import { CIE10_SEARCH, Cie10Entry } from '../../../core/models/diagnosis.model';
import { cie10SearchErrorMessage } from '../../../shared/utils/encounters-error.util';

type SearchState = 'idle' | 'short' | 'loading' | 'ready' | 'error';
type SearchResult = { state: SearchState; results: Cie10Entry[]; error?: string };

let nextId = 0;

// Fase 4 T4: buscador CIE-10 con autocompletar — PRESENTACIONAL. No sabe de dónde salen los datos:
// recibe `search` (mock o HTTP, lo decide el contenedor) y emite `picked` con el código elegido.
// - debounce de 300 ms, 2..100 caracteres (fuera de rango el backend responde 422: no se llama);
// - switchMap: una respuesta vieja nunca pisa la de la búsqueda más nueva;
// - mientras se tipea (debounce) el estado es 'loading' y no hay opción activa: Enter no elige un
//   resultado viejo;
// - teclado: ↑/↓ recorren, Enter elige, Escape cierra (patrón combobox de ARIA); al volver a
//   enfocar se reabre si hay resultados.
@Component({
  selector: 'app-cie10-search',
  templateUrl: './cie10-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cie10Search {
  private destroyRef = inject(DestroyRef);

  search = input.required<(q: string) => Observable<Cie10Entry[]>>();
  disabled = input(false);

  picked = output<Cie10Entry>();

  readonly listId = `cie10-results-${nextId++}`;
  readonly minChars = CIE10_SEARCH.minChars;
  readonly maxChars = CIE10_SEARCH.maxChars;

  readonly query = signal('');
  readonly state = signal<SearchState>('idle');
  readonly results = signal<Cie10Entry[]>([]);
  readonly error = signal<string | null>(null);
  readonly activeIndex = signal(-1);
  readonly open = signal(false);

  // La lista (listbox) solo existe con resultados vigentes y abierta.
  readonly listVisible = computed(() =>
    this.open() && this.results().length > 0 && (this.state() === 'ready' || this.state() === 'loading'));

  // Texto para la región aria-live (lectores de pantalla).
  readonly statusText = computed(() => {
    if (!this.query().trim()) return '';
    switch (this.state()) {
      case 'short': return `Escribí al menos ${this.minChars} caracteres.`;
      case 'loading': return 'Buscando…';
      case 'error': return this.error() ?? '';
      case 'ready': {
        const count = this.results().length;
        return count === 0 ? 'Sin resultados.' : `${count} resultado${count === 1 ? '' : 's'}.`;
      }
      default: return '';
    }
  });

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$.pipe(
      map(q => q.trim()),
      // Sin distinctUntilChanged: tras elegir un resultado la lista se vacía, y volver a escribir
      // el mismo término dentro del debounce tiene que buscar de nuevo.
      debounceTime(CIE10_SEARCH.debounceMs),
      switchMap((q): Observable<SearchResult> => {
        if (!q) return of({ state: 'idle', results: [] });
        if (q.length < CIE10_SEARCH.minChars) return of({ state: 'short', results: [] });
        return this.search()(q.slice(0, CIE10_SEARCH.maxChars)).pipe(
          map((results): SearchResult => ({ state: 'ready', results })),
          catchError(err => of<SearchResult>({ state: 'error', results: [], error: cie10SearchErrorMessage(err) })),
          startWith<SearchResult>({ state: 'loading', results: this.results() }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ state, results, error }) => {
      this.state.set(state);
      this.results.set(results);
      this.error.set(error ?? null);
      this.activeIndex.set(results.length > 0 && state === 'ready' ? 0 : -1);
    });
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    // Hasta que llegue la respuesta del término nuevo, nada está activo.
    this.activeIndex.set(-1);
    const trimmed = value.trim();
    this.state.set(!trimmed ? 'idle' : trimmed.length < CIE10_SEARCH.minChars ? 'short' : 'loading');
    this.query$.next(value);
  }

  onFocus(): void {
    if (this.results().length > 0) this.open.set(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.state() === 'ready' ? this.results().length : 0;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        this.open.set(true);
        this.activeIndex.update(i => (i + 1) % count);
        return;
      case 'ArrowUp':
        if (count === 0) return;
        event.preventDefault();
        this.open.set(true);
        this.activeIndex.update(i => (i <= 0 ? count - 1 : i - 1));
        return;
      case 'Enter': {
        // Enter dentro del buscador nunca envía el formulario del diagnóstico.
        event.preventDefault();
        const entry = this.results()[this.activeIndex()];
        if (this.open() && this.state() === 'ready' && entry) this.pick(entry);
        return;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.open.set(false);
        }
        return;
    }
  }

  pick(entry: Cie10Entry): void {
    if (this.disabled()) return;
    this.picked.emit(entry);
    this.query.set('');
    this.query$.next('');
    this.results.set([]);
    this.state.set('idle');
    this.activeIndex.set(-1);
    this.open.set(false);
  }

  close(): void {
    this.open.set(false);
  }

  optionId(index: number): string {
    return `${this.listId}-${index}`;
  }
}
