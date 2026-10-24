import { TestBed, ComponentFixture } from '@angular/core/testing';
import { VoidEncounterDialog } from './void-encounter-dialog';

describe('VoidEncounterDialog', () => {
  let fixture: ComponentFixture<VoidEncounterDialog>;
  let emitted: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VoidEncounterDialog] }).compileComponents();
    fixture = TestBed.createComponent(VoidEncounterDialog);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    emitted = [];
    fixture.componentInstance.confirmed.subscribe(r => emitted.push(r));
  });

  afterEach(() => {
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
  });

  it('no emite con motivo vacío o solo espacios', () => {
    const cmp = fixture.componentInstance;
    cmp.submit();
    cmp.form.controls.reason.setValue('    ');
    cmp.submit();
    expect(emitted).toEqual([]);
    expect(cmp.form.controls.reason.invalid).toBe(true);
  });

  it('no emite con más de 500 caracteres', () => {
    const cmp = fixture.componentInstance;
    cmp.form.controls.reason.setValue('a'.repeat(501));
    cmp.submit();
    expect(emitted).toEqual([]);
  });

  it('emite el motivo recortado cuando es válido', () => {
    const cmp = fixture.componentInstance;
    cmp.form.controls.reason.setValue('  Paciente equivocado  ');
    cmp.submit();
    expect(emitted).toEqual(['Paciente equivocado']);
  });
});
