import { TestBed, ComponentFixture } from '@angular/core/testing';
import { EncounterNote } from './encounter-note';
import { Encounter, EncounterNotePatch, EncounterStatus } from '../../../core/models/encounter.model';

function makeEncounter(status: EncounterStatus, overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: 'enc-1', clinical_record_id: 'cr-1', patient_id: 'pat-1', professional_id: 'prof-1',
    appointment_id: null, specialty_id: null, form_template_id: null,
    encounter_date: '2026-10-10T14:00:00Z',
    chief_complaint: 'Cefalea', anamnesis: 'Dolor frontal', exam: 'TA 120/80',
    clinical_data: {}, status,
    signed_at: status === 'open' ? null : '2026-10-10T15:00:00Z',
    signed_by: status === 'open' ? null : 'user-1',
    voided_at: status === 'voided' ? '2026-10-11T09:00:00Z' : null,
    voided_by: status === 'voided' ? 'user-1' : null,
    void_reason: status === 'voided' ? 'Paciente equivocado' : null,
    created_at: '2026-10-10T14:00:00Z',
    version: 1,
    ...overrides,
  };
}

describe('EncounterNote', () => {
  let fixture: ComponentFixture<EncounterNote>;
  let el: HTMLElement;

  async function render(encounter: Encounter): Promise<void> {
    fixture.componentRef.setInput('encounter', encounter);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const q = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const textarea = (field: string) => q(`field-${field}`) as HTMLTextAreaElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EncounterNote] }).compileComponents();
    fixture = TestBed.createComponent(EncounterNote);
    el = fixture.nativeElement as HTMLElement;
  });

  it('en open: campos editables y botones Guardar/Firmar/Anular', async () => {
    await render(makeEncounter('open'));

    for (const field of ['chief_complaint', 'anamnesis', 'exam']) {
      expect(textarea(field).readOnly).toBe(false);
    }
    expect(q('btn-save')).not.toBeNull();
    expect(q('btn-sign')).not.toBeNull();
    expect(q('btn-void')).not.toBeNull();
    expect(q('status-badge')?.textContent).toContain('Abierto');
  });

  it('en signed: campos de solo lectura y solo Anular', async () => {
    await render(makeEncounter('signed'));

    for (const field of ['chief_complaint', 'anamnesis', 'exam']) {
      expect(textarea(field).readOnly).toBe(true);
    }
    expect(q('btn-save')).toBeNull();
    expect(q('btn-sign')).toBeNull();
    expect(q('btn-void')).not.toBeNull();
    expect(q('signed-info')).not.toBeNull();
    expect(q('status-badge')?.textContent).toContain('Firmado');
  });

  it('en voided: campos de solo lectura, sin acciones y con motivo de anulación', async () => {
    await render(makeEncounter('voided'));

    for (const field of ['chief_complaint', 'anamnesis', 'exam']) {
      expect(textarea(field).readOnly).toBe(true);
    }
    expect(q('btn-save')).toBeNull();
    expect(q('btn-sign')).toBeNull();
    expect(q('btn-void')).toBeNull();
    expect(q('voided-info')?.textContent).toContain('Paciente equivocado');
    expect(q('status-badge')?.textContent).toContain('Anulado');
  });

  it('pasa de editable a solo lectura cuando el encounter que llega cambia a signed', async () => {
    await render(makeEncounter('open'));
    expect(textarea('anamnesis').readOnly).toBe(false);

    await render(makeEncounter('signed'));
    expect(textarea('anamnesis').readOnly).toBe(true);
    expect(q('btn-sign')).toBeNull();
  });

  for (const status of ['open', 'signed'] as const) {
    it(`si el usuario no es el profesional (${status}): solo lectura y sin acciones`, async () => {
      fixture.componentRef.setInput('canEdit', false);
      await render(makeEncounter(status));

      for (const field of ['chief_complaint', 'anamnesis', 'exam']) {
        expect(textarea(field).readOnly).toBe(true);
      }
      expect(q('btn-save')).toBeNull();
      expect(q('btn-sign')).toBeNull();
      expect(q('btn-void')).toBeNull();
      expect(q('not-owner-info')).not.toBeNull();
    });
  }

  for (const busyInput of ['saving', 'signing', 'voiding'] as const) {
    it(`A2: con ${busyInput} en curso los textareas quedan en solo lectura y no se emite`, async () => {
      await render(makeEncounter('open'));
      let emitted = 0;
      fixture.componentInstance.save.subscribe(() => emitted++);
      fixture.componentInstance.sign.subscribe(() => emitted++);

      fixture.componentRef.setInput(busyInput, true);
      fixture.detectChanges();
      await fixture.whenStable();

      for (const field of ['chief_complaint', 'anamnesis', 'exam']) {
        expect(textarea(field).readOnly).toBe(true);
      }
      fixture.componentInstance.form.controls.anamnesis.setValue('x');
      fixture.componentInstance.form.markAsDirty();
      fixture.componentInstance.submit();
      fixture.componentInstance.requestSign();
      expect(emitted).toBe(0);
    });
  }

  it('re-aplica el borrador sobre el encounter recibido y lo deja como cambio sin guardar', async () => {
    fixture.componentRef.setInput('draft', { anamnesis: 'borrador', exam: null });
    await render(makeEncounter('open', { chief_complaint: 'del server', version: 2 }));

    expect(textarea('chief_complaint').value).toBe('del server');
    expect(textarea('anamnesis').value).toBe('borrador');
    expect(textarea('exam').value).toBe('');
    expect(fixture.componentInstance.dirty()).toBe(true);
    expect((q('btn-sign') as HTMLButtonElement).disabled).toBe(true);
  });

  it('no aplica el borrador si la nota ya no es editable', async () => {
    fixture.componentRef.setInput('draft', { anamnesis: 'borrador' });
    await render(makeEncounter('signed'));

    expect(textarea('anamnesis').value).toBe('Dolor frontal');
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('muestra contador de caracteres con el límite', async () => {
    await render(makeEncounter('open', { chief_complaint: 'Hola' }));
    expect(q('counter-chief_complaint')?.textContent?.replace(/\s/g, '')).toBe('4/500');
    expect(q('counter-anamnesis')?.textContent).toContain('/20000');
  });

  it('guardar emite solo los campos cambiados; vacío se manda como null', async () => {
    await render(makeEncounter('open'));
    const emitted: EncounterNotePatch[] = [];
    fixture.componentInstance.save.subscribe(dto => emitted.push(dto));

    const anamnesis = textarea('anamnesis');
    anamnesis.value = 'Nueva anamnesis';
    anamnesis.dispatchEvent(new Event('input'));
    const exam = textarea('exam');
    exam.value = '   ';
    exam.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(emitted).toEqual([{ anamnesis: 'Nueva anamnesis', exam: null }]);
  });

  it('Firmar queda deshabilitado mientras haya cambios sin guardar', async () => {
    await render(makeEncounter('open'));
    let signs = 0;
    fixture.componentInstance.sign.subscribe(() => signs++);

    const anamnesis = textarea('anamnesis');
    anamnesis.value = 'editado';
    anamnesis.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect((q('btn-sign') as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.requestSign();
    expect(signs).toBe(0);
  });

  it('Firmar y Anular emiten sus eventos', async () => {
    await render(makeEncounter('open'));
    let signs = 0;
    let voids = 0;
    fixture.componentInstance.sign.subscribe(() => signs++);
    fixture.componentInstance.voidRequested.subscribe(() => voids++);

    q('btn-sign')!.click();
    q('btn-void')!.click();

    expect(signs).toBe(1);
    expect(voids).toBe(1);
  });
});
