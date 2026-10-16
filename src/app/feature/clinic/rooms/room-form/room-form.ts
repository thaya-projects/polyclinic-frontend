import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateRoomDto, Room, UpdateRoomDto } from '../../../../core/models/room.model';
import { Branch } from '../../../../core/models/branch.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

// Reutilizable: si `room` viene → edit (emit saved). Si null → create (emit created).
// defaultBranchId se usa para pre-seleccionar la branch del selector cuando se abre en modo create.
@Component({
  selector: 'app-room-form',
  imports: [ReactiveFormsModule],
  templateUrl: './room-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomForm {
  private fb = inject(FormBuilder);

  room = input<Room | null>(null);
  availableBranches = input.required<Branch[]>();
  defaultBranchId = input<string | null>(null);

  created = output<CreateRoomDto>();
  saved = output<UpdateRoomDto>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly isEdit = computed(() => this.room() !== null);

  form = this.fb.group({
    name: ['', Validators.required],
    branch_id: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const r = this.room();
      if (r) {
        this.form.patchValue({ name: r.name, branch_id: r.branch_id }, { emitEvent: false });
      } else {
        this.form.reset(
          { name: '', branch_id: this.defaultBranchId() ?? '' },
          { emitEvent: false });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    const initial = this.room();
    if (initial) {
      // Diff-only: solo keys que cambian.
      const dto: UpdateRoomDto = {};
      if (raw.name !== initial.name) dto.name = raw.name!;
      if (raw.branch_id !== initial.branch_id) dto.branch_id = raw.branch_id!;
      this.saved.emit(dto);
      return;
    }

    this.created.emit({ name: raw.name!, branch_id: raw.branch_id! });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
