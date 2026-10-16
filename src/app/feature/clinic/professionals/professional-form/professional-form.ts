import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateProfessionalDto, Professional, UpdateProfessionalDto,
} from '../../../../core/models/professional.model';
import { Specialty } from '../../../../core/models/specialty.model';
import { fieldErrorMessage, fieldInputClass, isFieldInvalid } from '../../../../shared/utils/form-validation.util';

// Reutilizable: si `professional` viene → edit (emit saved). Si null → create (emit created).
// Las specialties se manejan aparte porque el backend las expone en un endpoint PUT dedicado —
// el form las mantiene en un signal local y las emite junto con el resto solo en modo create.
// En edit, el componente padre decide si emitir un segundo PUT específico para specialties.
@Component({
  selector: 'app-professional-form',
  imports: [ReactiveFormsModule],
  templateUrl: './professional-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfessionalForm {
  private fb = inject(FormBuilder);

  professional = input<Professional | null>(null);
  availableSpecialties = input.required<Specialty[]>();

  created = output<{ dto: CreateProfessionalDto }>();
  saved = output<{ patch: UpdateProfessionalDto; specialtyIds: string[]; specialtiesChanged: boolean }>();
  cancelled = output<void>();

  readonly inputClass = fieldInputClass;
  readonly isInvalid = isFieldInvalid;
  readonly errorMessage = fieldErrorMessage;

  readonly isEdit = computed(() => this.professional() !== null);

  // Selección de specialties: set local, no atado al FormGroup (el multi-select con chips es más
  // simple con signals que con FormArray para este caso).
  readonly selectedSpecialtyIds = signal<Set<string>>(new Set());

  form = this.fb.group({
    full_name: ['', Validators.required],
    license_number: [''],
    email: ['', Validators.email],
    phone: [''],
  });

  constructor() {
    effect(() => {
      const p = this.professional();
      if (p) {
        this.form.patchValue({
          full_name: p.full_name,
          license_number: p.license_number ?? '',
          email: p.email ?? '',
          phone: p.phone ?? '',
        }, { emitEvent: false });
        this.selectedSpecialtyIds.set(new Set(p.specialty_ids));
      } else {
        this.form.reset({ full_name: '', license_number: '', email: '', phone: '' }, { emitEvent: false });
        this.selectedSpecialtyIds.set(new Set());
      }
    });
  }

  toggleSpecialty(id: string): void {
    this.selectedSpecialtyIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isSelected(id: string): boolean {
    return this.selectedSpecialtyIds().has(id);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const licenseNumber = raw.license_number?.trim() ? raw.license_number : null;
    const email = raw.email?.trim() ? raw.email : null;
    const phone = raw.phone?.trim() ? raw.phone : null;
    const specialtyIds = Array.from(this.selectedSpecialtyIds());

    const initial = this.professional();
    if (initial) {
      const patch: UpdateProfessionalDto = {};
      if (raw.full_name !== initial.full_name) patch.full_name = raw.full_name!;
      if (licenseNumber !== initial.license_number) patch.license_number = licenseNumber;
      if (email !== initial.email) patch.email = email;
      if (phone !== initial.phone) patch.phone = phone;

      const initialSet = new Set(initial.specialty_ids);
      const specialtiesChanged = initialSet.size !== specialtyIds.length
        || specialtyIds.some(id => !initialSet.has(id));

      this.saved.emit({ patch, specialtyIds, specialtiesChanged });
      return;
    }

    const dto: CreateProfessionalDto = {
      full_name: raw.full_name!,
      license_number: licenseNumber,
      email,
      phone,
      user_id: null,
      specialty_ids: specialtyIds,
    };
    this.created.emit({ dto });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
