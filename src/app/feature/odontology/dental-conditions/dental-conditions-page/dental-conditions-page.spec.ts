import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DentalConditionsPage } from './dental-conditions-page';
import { DentalConditionForm } from '../dental-condition-form/dental-condition-form';
import { DENTAL_CONDITIONS_REPOSITORY } from '../../../../core/services/dental-conditions-repository';
import { MockDentalConditionsRepository } from '../../../../testing/dental-conditions-mock.repository';
import {
  DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE, ODONTOGRAM_DISABLED_MESSAGE,
} from '../../../../shared/utils/dental-conditions-error.util';

// La pantalla corre contra el mock (desacoplada de la fuente de datos).
describe('DentalConditionsPage', () => {
  let fixture: ComponentFixture<DentalConditionsPage>;
  let page: DentalConditionsPage;

  const el = () => fixture.nativeElement as HTMLElement;
  const rowOf = (code: string) =>
    Array.from(el().querySelectorAll('tr')).find(tr => tr.textContent?.includes(code)) as HTMLTableRowElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [DentalConditionsPage],
      providers: [{ provide: DENTAL_CONDITIONS_REPOSITORY, useClass: MockDentalConditionsRepository }],
    });
    fixture = TestBed.createComponent(DentalConditionsPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('lista code, name, category y muestra el color', () => {
    const row = rowOf('caries');
    expect(row.textContent).toContain('Caries');
    expect(row.textContent).toContain('patologia');
    expect(row.textContent).toContain('#E53935');
    const swatch = row.querySelector('[data-testid="color-cell"] span') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('rgb(229, 57, 53)');
  });

  it('globales: badge "Global" y sin botón Editar; propias: "Propia" y editables', () => {
    const global = rowOf('caries');
    expect(global.textContent).toContain('Global');
    expect(global.textContent).toContain('Solo lectura');
    expect(global.querySelector('button')).toBeNull();

    const own = rowOf('sellante');
    expect(own.textContent).toContain('Propia');
    (own.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(page.modalMode()).toBe('edit');
  });

  it('openEdit ignora globales', () => {
    page.openEdit(page.conditions().find(c => c.code === 'caries')!);
    expect(page.modalMode()).toBe('none');
  });

  it('alta OK: agrega la propia y cierra el modal', () => {
    page.openCreateModal();
    page.onCreate({ code: 'fractura', name: 'Fractura' });
    fixture.detectChanges();
    expect(page.modalMode()).toBe('none');
    expect(rowOf('fractura').textContent).toContain('Propia');
  });

  it('alta con code repetido: "código ya existe" debajo del input Código (sin banner)', () => {
    page.openCreateModal();
    fixture.detectChanges();
    page.onCreate({ code: 'sellante', name: 'Otro' });
    fixture.detectChanges();
    expect(page.modalMode()).toBe('create');
    expect(page.actionError()).toBeNull();
    const form = fixture.debugElement.query(By.directive(DentalConditionForm)).componentInstance as DentalConditionForm;
    expect(form.form.controls.code.errors?.['server']).toBe(DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE);
  });

  it('edición OK: actualiza la fila', () => {
    page.openEdit(page.conditions().find(c => c.code === 'sellante')!);
    page.onSaveEdit({ name: 'Sellante de fosas' });
    fixture.detectChanges();
    expect(page.modalMode()).toBe('none');
    expect(rowOf('sellante').textContent).toContain('Sellante de fosas');
  });
});

describe('DentalConditionsPage: módulo odontogram apagado', () => {
  let fixture: ComponentFixture<DentalConditionsPage>;
  let repo: MockDentalConditionsRepository;

  const el = () => fixture.nativeElement as HTMLElement;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(DentalConditionsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DentalConditionsPage],
      providers: [{ provide: DENTAL_CONDITIONS_REPOSITORY, useClass: MockDentalConditionsRepository }],
    });
    repo = TestBed.inject(DENTAL_CONDITIONS_REPOSITORY) as MockDentalConditionsRepository;
  });

  it('listado con 403 del módulo: estado bloqueado con mensaje claro, sin tabla ni alta', async () => {
    repo.setOdontogramEnabled(false);
    await render();
    const blocked = el().querySelector('[data-testid="module-disabled"]');
    expect(blocked?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
    expect(el().querySelector('table')).toBeNull();
    expect(el().textContent).not.toContain('Nueva condición');
  });

  it('el módulo se apaga con la pantalla abierta: el alta cierra el modal y bloquea la pantalla', async () => {
    await render();
    const page = fixture.componentInstance;
    page.openCreateModal();
    repo.setOdontogramEnabled(false);
    page.onCreate({ code: 'fractura', name: 'Fractura' });
    fixture.detectChanges();
    expect(page.modalMode()).toBe('none');
    expect(page.moduleDisabled()).toBe(true);
    expect(el().querySelector('[data-testid="module-disabled"]')?.textContent).toContain(ODONTOGRAM_DISABLED_MESSAGE);
  });
});

