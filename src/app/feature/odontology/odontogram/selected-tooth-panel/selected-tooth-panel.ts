import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ToothInfo, toothInfo } from '../../../../core/models/odontogram.model';

// Presentacional: panel de la pieza seleccionada. Sin lógica de negocio: muestra la pieza y deja un
// slot (<ng-content select="[toothActions]">) donde la tarea "marcar pieza" enchufará las condiciones
// del catálogo. Sin slot proyectado muestra un placeholder.
@Component({
  selector: 'app-selected-tooth-panel',
  templateUrl: './selected-tooth-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedToothPanel {
  tooth = input<number | null>(null);

  cleared = output<void>();

  readonly info = computed<ToothInfo | null>(() => {
    const fdi = this.tooth();
    return fdi === null ? null : toothInfo(fdi);
  });
}
