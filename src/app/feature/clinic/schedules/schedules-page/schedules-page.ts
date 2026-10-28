import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleGrid } from '../schedule-grid/schedule-grid';
import { ExceptionsSection } from '../exceptions-section/exceptions-section';
import { SchedulesService } from '../../../../core/services/schedules.service';
import { ProfessionalsService } from '../../../../core/services/professionals.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import {
  CreateScheduleExceptionDto, ScheduleBlockInput,
} from '../../../../core/models/schedule.model';
import { scheduleSaveErrorMessage } from '../../../../shared/utils/clinic-settings-error.util';

@Component({
  selector: 'app-schedules-page',
  imports: [CommonModule, ScheduleGrid, ExceptionsSection],
  templateUrl: './schedules-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesPage {
  private schedulesSvc = inject(SchedulesService);
  private professionalsSvc = inject(ProfessionalsService);
  private branchesSvc = inject(BranchesService);

  readonly schedule = this.schedulesSvc.schedule;
  readonly scheduleLoading = this.schedulesSvc.scheduleLoading;
  readonly scheduleError = this.schedulesSvc.scheduleError;
  readonly exceptions = this.schedulesSvc.exceptions;
  readonly exceptionsLoading = this.schedulesSvc.exceptionsLoading;
  readonly exceptionsError = this.schedulesSvc.exceptionsError;

  readonly professionals = computed(() => this.professionalsSvc.getAll()()
    .filter(p => p.is_active));
  readonly branches = computed(() => this.branchesSvc.getAll()());
  readonly activeBranches = computed(() => this.branches().filter(b => b.is_active));

  selectedProfessionalId = signal<string | null>(null);

  savingSchedule = signal(false);
  saveScheduleError = signal<string | null>(null);
  savingException = signal(false);
  deleteExceptionError = signal<string | null>(null);

  private exceptionsSection = viewChild(ExceptionsSection);
  removingExceptionId = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Horarios');
    this.professionalsSvc.load();
    this.branchesSvc.load();
    this.schedulesSvc.loadExceptions();

    // Preselección automática del primer professional activo cuando llega la lista.
    effect(() => {
      const list = this.professionals();
      if (this.selectedProfessionalId() === null && list.length > 0) {
        this.selectedProfessionalId.set(list[0].id);
      }
    });

    // Carga del schedule cada vez que cambia el professional seleccionado.
    effect(() => {
      const pid = this.selectedProfessionalId();
      if (pid) this.schedulesSvc.loadScheduleFor(pid);
    });
  }

  onProfessionalChange(id: string): void {
    this.selectedProfessionalId.set(id);
  }

  onSaveSchedule(items: ScheduleBlockInput[]): void {
    const pid = this.selectedProfessionalId();
    if (!pid) return;
    this.savingSchedule.set(true);
    this.saveScheduleError.set(null);
    this.schedulesSvc.replaceSchedule(pid, { items }).subscribe({
      next: () => this.savingSchedule.set(false),
      error: (err: unknown) => {
        this.savingSchedule.set(false);
        this.saveScheduleError.set(scheduleSaveErrorMessage(err, 'No se pudo guardar el horario.'));
      },
    });
  }

  onCreateException(dto: CreateScheduleExceptionDto): void {
    this.savingException.set(true);
    this.schedulesSvc.createException(dto).subscribe({
      next: () => {
        this.savingException.set(false);
        this.exceptionsSection()?.closeModal();
      },
      error: (err: unknown) => {
        this.savingException.set(false);
        // Error de un campo → debajo del input del modal; si no, banner del modal con el motivo.
        const section = this.exceptionsSection();
        if (section && !section.applyServerError(err)) {
          section.showError(scheduleSaveErrorMessage(err, 'No se pudo crear la excepción.'));
        }
      },
    });
  }

  onRemoveException(id: string): void {
    this.removingExceptionId.set(id);
    this.deleteExceptionError.set(null);
    this.schedulesSvc.deleteException(id).subscribe({
      next: () => this.removingExceptionId.set(null),
      error: (err: unknown) => {
        this.removingExceptionId.set(null);
        this.deleteExceptionError.set(scheduleSaveErrorMessage(err, 'No se pudo eliminar la excepción.'));
      },
    });
  }
}
