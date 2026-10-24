import { TestBed, ComponentFixture } from '@angular/core/testing';
import { EncounterCreateForm, EncounterCreateFormValue } from './encounter-create-form';
import { EncounterPartyOption } from '../../../core/models/encounter.model';

const PATIENTS: EncounterPartyOption[] = [
  { id: 'pat-1', name: 'Ana Gómez', label: 'Ana Gómez — 30111222' },
  { id: 'pat-2', name: 'Luis Pérez', label: 'Luis Pérez — 28444555' },
];
const PROFESSIONAL: EncounterPartyOption = { id: 'prof-1', name: 'Dra. Laura Méndez', label: 'Dra. Laura Méndez' };

describe('EncounterCreateForm', () => {
  let fixture: ComponentFixture<EncounterCreateForm>;
  let el: HTMLElement;
  let emitted: EncounterCreateFormValue[];

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  async function render(inputs: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EncounterCreateForm] }).compileComponents();
    fixture = TestBed.createComponent(EncounterCreateForm);
    el = fixture.nativeElement as HTMLElement;
    emitted = [];
    fixture.componentInstance.submitted.subscribe(v => emitted.push(v));
  });

  it('muestra el profesional del usuario (no un select) y preselecciona el paciente', async () => {
    await render({ patients: PATIENTS, professional: PROFESSIONAL, initialPatientId: 'pat-2' });

    expect(q('create-professional')?.textContent).toContain('Dra. Laura Méndez');
    expect((q('patient-select') as HTMLSelectElement).value).toBe('pat-2');
  });

  it('emite paciente + motivo (vacío → null)', async () => {
    await render({ patients: PATIENTS, professional: PROFESSIONAL, initialPatientId: 'pat-1' });
    fixture.componentInstance.form.controls.chief_complaint.setValue('   ');

    fixture.componentInstance.submit();

    expect(emitted).toEqual([{ patient_id: 'pat-1', chief_complaint: null }]);
  });

  it('paciente obligatorio', async () => {
    await render({ patients: PATIENTS, professional: PROFESSIONAL });
    fixture.componentInstance.submit();
    expect(emitted).toEqual([]);
    expect(fixture.componentInstance.form.controls.patient_id.touched).toBe(true);
  });

  it('sin profesional habilitado: muestra el motivo y no emite', async () => {
    await render({ patients: PATIENTS, professional: null, disabledReason: 'Tu profesional está desactivado.', initialPatientId: 'pat-1' });

    expect(q('create-no-professional')?.textContent).toContain('Tu profesional está desactivado.');
    fixture.componentInstance.submit();
    expect(emitted).toEqual([]);
  });

  it('con saving: fieldset deshabilitado y submit no emite', async () => {
    await render({ patients: PATIENTS, professional: PROFESSIONAL, initialPatientId: 'pat-1', saving: true });

    expect((el.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    fixture.componentInstance.submit();
    expect(emitted).toEqual([]);
  });

  it('el buscador emite el término con debounce y está fuera del <form>', async () => {
    vi.useFakeTimers();
    try {
      await render({ patients: PATIENTS, professional: PROFESSIONAL });
      const searches: string[] = [];
      fixture.componentInstance.patientSearch.subscribe(t => searches.push(t));

      const input = q('patient-search') as HTMLInputElement;
      expect(input.closest('form')).toBeNull();
      input.value = 'Lu';
      input.dispatchEvent(new Event('input'));
      input.value = 'Luis';
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);

      expect(searches).toEqual(['Luis']);
    } finally {
      vi.useRealTimers();
    }
  });
});
