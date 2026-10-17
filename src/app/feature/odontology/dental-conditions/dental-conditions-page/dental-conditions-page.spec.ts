import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DentalConditionsPage } from './dental-conditions-page';
import { DENTAL_CONDITIONS_REPOSITORY } from '../../../../core/services/dental-conditions-repository';
import { MockDentalConditionsRepository } from '../../../../testing/dental-conditions-mock.repository';
import { DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE } from '../../../../shared/utils/dental-conditions-error.util';

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

  it('alta con code repetido: mensaje "código ya existe" en el modal', () => {
    page.openCreateModal();
    page.onCreate({ code: 'sellante', name: 'Otro' });
    expect(page.modalMode()).toBe('create');
    expect(page.actionError()).toBe(DENTAL_CONDITION_DUPLICATE_CODE_MESSAGE);
  });

  it('edición OK: actualiza la fila', () => {
    page.openEdit(page.conditions().find(c => c.code === 'sellante')!);
    page.onSaveEdit({ name: 'Sellante de fosas' });
    fixture.detectChanges();
    expect(page.modalMode()).toBe('none');
    expect(rowOf('sellante').textContent).toContain('Sellante de fosas');
  });
});
