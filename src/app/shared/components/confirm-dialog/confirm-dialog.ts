import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';

export type ConfirmTone = 'default' | 'danger';

// Diálogo de confirmación genérico y reutilizable — cualquier acción que
// necesite un "¿estás seguro?" (suspender, cancelar, etc.) lo usa tal cual,
// solo cambiando título/mensaje/tono.
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  open = input(false);
  title = input('');
  message = input('');
  confirmLabel = input('Confirmar');
  cancelLabel = input('Cancelar');
  tone = input<ConfirmTone>('default');

  confirmed = output<void>();
  cancelled = output<void>();
}
