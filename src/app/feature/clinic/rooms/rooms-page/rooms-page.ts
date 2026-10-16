import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RoomsTable } from '../rooms-table/rooms-table';
import { RoomForm } from '../room-form/room-form';
import { Modal } from '../../../../shared/components/modal/modal';
import { RoomsService } from '../../../../core/services/rooms.service';
import { BranchesService } from '../../../../core/services/branches.service';
import { PageTitleService } from '../../../../core/services/page-title.service';
import { CreateRoomDto, Room, UpdateRoomDto } from '../../../../core/models/room.model';
import { httpErrorMessage } from '../../../../shared/utils/http-error.util';

type ModalMode = 'none' | 'create' | 'edit';

@Component({
  selector: 'app-rooms-page',
  imports: [RoomsTable, RoomForm, Modal],
  templateUrl: './rooms-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsPage {
  private roomsSvc = inject(RoomsService);
  private branchesSvc = inject(BranchesService);
  private allRooms = this.roomsSvc.getAll();
  private allBranches = this.branchesSvc.getAll();

  readonly listLoading = this.roomsSvc.loading;
  readonly listError = this.roomsSvc.error;
  readonly rooms = computed(() => this.allRooms());

  // Selector muestra TODAS las branches (activas + inactivas) para que el usuario no pierda
  // acceso visual a rooms de branches desactivadas. El form las etiqueta como "(inactiva)".
  // Activas primero para que la pre-selección automática tome una activa.
  readonly branchesForSelector = computed(() => {
    const all = this.allBranches();
    return [...all.filter(b => b.is_active), ...all.filter(b => !b.is_active)];
  });

  // Para el gating del botón "Nueva sala": sin branch activa no tiene sentido crear.
  readonly hasActiveBranch = computed(() => this.allBranches().some(b => b.is_active));

  // Selección actual del selector superior. null = aún no eligió / no hay branches.
  selectedBranchId = signal<string | null>(null);

  modalMode = signal<ModalMode>('none');
  selectedRoom = signal<Room | null>(null);

  saving = signal(false);
  actionError = signal<string | null>(null);

  toggling = signal<string | null>(null);
  toggleError = signal<string | null>(null);

  constructor() {
    inject(PageTitleService).set('Salas');
    this.branchesSvc.load();

    // Preselección automática cuando llegan las branches (si aún no hay nada elegido).
    // Toma la primera (que será activa por el ordering de branchesForSelector).
    effect(() => {
      const branches = this.branchesForSelector();
      if (this.selectedBranchId() === null && branches.length > 0) {
        this.selectedBranchId.set(branches[0].id);
      }
    });

    // Carga de rooms cuando cambia la branch seleccionada.
    effect(() => {
      const branchId = this.selectedBranchId();
      if (branchId) this.roomsSvc.loadFor(branchId);
    });
  }

  onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId);
  }

  openCreateModal(): void {
    this.selectedRoom.set(null);
    this.actionError.set(null);
    this.modalMode.set('create');
  }

  openEdit(room: Room): void {
    this.selectedRoom.set(room);
    this.actionError.set(null);
    this.modalMode.set('edit');
  }

  closeModal(): void {
    this.modalMode.set('none');
    this.selectedRoom.set(null);
    this.actionError.set(null);
  }

  onCreate(dto: CreateRoomDto): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.roomsSvc.create(dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  onSaveEdit(dto: UpdateRoomDto): void {
    const room = this.selectedRoom();
    if (!room) return;
    this.saving.set(true);
    this.actionError.set(null);
    this.roomsSvc.update(room.id, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(httpErrorMessage(err));
      },
    });
  }

  onToggleActive(room: Room): void {
    this.toggling.set(room.id);
    this.toggleError.set(null);
    this.roomsSvc.update(room.id, { is_active: !room.is_active }).subscribe({
      next: () => this.toggling.set(null),
      error: (err: unknown) => {
        this.toggling.set(null);
        this.toggleError.set(httpErrorMessage(err));
      },
    });
  }
}
