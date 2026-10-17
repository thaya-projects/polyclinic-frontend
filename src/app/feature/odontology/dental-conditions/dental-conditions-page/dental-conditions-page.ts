import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DentalConditionsTable } from '../dental-conditions-table/dental-conditions-table';
import { DentalConditionForm } from '../dental-condition-form/dental-condition-form';
import { Modal } from '../../../../shared/components/modal/modal';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { DENTAL_CONDITIONS_REPOSITORY } from '../../../../core/services/dental-conditions-repository';
import {
  CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto, isGlobalDentalCondition,
} from '../../../../core/models/dental-condition.model';
import {
  DENTAL_CONDITIONS_LOAD_ERROR_MESSAGE, dentalConditionError,
} from '../../../../shared/utils/dental-conditions-error.util';

type ModalMode = 'none' | 'create' | 'edit';

// Fase 6 T5: Odontología > Catálogo. Solo conoce DENTAL_CONDITIONS_REPOSITORY (mock o HTTP).
@Component({
  selector: 'app-dental-conditions-page',
  imports: [DentalConditionsTable, DentalConditionForm, Modal],
  templateUrl: './dental-conditions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DentalConditionsPage {
  private repo = inject(DENTAL_CONDITIONS_REPOSITORY);
  private destroyRef = inject(DestroyRef);
  private platformId = inject(PLATFORM_ID);

  readonly conditions = signal<DentalCondition[]>([]);
  // Arranca en true: en el prerender (SSR) no se pide nada y se muestra el estado de carga.
  readonly listLoading = signal(true);
  readonly listError = signal<string | null>(null);
  // Aviso no bloqueante sobre el listado (ej. la condición editada ya no existe).
  readonly notice = signal<string | null>(null);

  modalMode = signal<ModalMode>('none');
  selectedCondition = signal<DentalCondition | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Catálogo odontológico');
    this.load();
  }

  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.listLoading.set(true);
    this.listError.set(null);
    this.repo.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.conditions.set(list);
        this.listLoading.set(false);
      },
      error: (err: unknown) => {
        this.listLoading.set(false);
        this.listError.set(dentalConditionError(err, DENTAL_CONDITIONS_LOAD_ERROR_MESSAGE).message);
      },
    });
  }

  openCreateModal(): void {
    this.selectedCondition.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(condition: DentalCondition): void {
    // Globales no editables — el backend rechazaría con 403, la tabla ya oculta el botón.
    if (isGlobalDentalCondition(condition)) return;
    this.selectedCondition.set(condition);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedCondition.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreateDentalConditionDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.repo.create(dto).subscribe({
      next: created => {
        this.saving.set(false);
        this.upsertLocal(created);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(dentalConditionError(err, 'No se pudo crear la condición.').message);
      },
    });
  }

  onSaveEdit(dto: UpdateDentalConditionDto): void {
    const condition = this.selectedCondition();
    if (!condition) return;
    if (Object.keys(dto).length === 0) {
      this.closeModal();
      return;
    }
    this.saving.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    this.repo.update(condition.id, dto).subscribe({
      next: updated => {
        this.saving.set(false);
        this.upsertLocal(updated);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const { kind, message } = dentalConditionError(err, 'No se pudo guardar la condición.');
        // Ya no existe (o pasó a ser global): el listado quedó viejo → cerrar, avisar y recargar.
        if (kind === 'not_found' || kind === 'global_not_editable') {
          this.closeModal();
          this.notice.set(message);
          this.load();
          return;
        }
        this.actionError.set(message);
      },
    });
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  private upsertLocal(condition: DentalCondition): void {
    this.conditions.update(list => list.some(c => c.id === condition.id)
      ? list.map(c => (c.id === condition.id ? condition : c))
      : [...list, condition]);
  }
}
