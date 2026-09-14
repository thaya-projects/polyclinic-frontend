import { ChangeDetectionStrategy, Component, HostListener, PLATFORM_ID, computed, effect, inject, input, output } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// Modal genérico y reutilizable — cada consumidor le da el tamaño que
// corresponda (`size`) y proyecta su propio contenido y, opcionalmente,
// un pie de acciones con el atributo `modalFooter`.
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  private platformId = inject(PLATFORM_ID);

  open = input(false);
  title = input('');
  size = input<ModalSize>('md');

  closed = output<void>();

  sizeClass = computed(() => SIZE_CLASS[this.size()]);

  constructor() {
    // Bloquea el scroll de fondo mientras el modal está abierto.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      document.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.closed.emit();
  }

  requestClose(): void {
    this.closed.emit();
  }
}
