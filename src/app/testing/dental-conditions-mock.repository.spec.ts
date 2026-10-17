import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MOCK_DENTAL_TENANT_ID, MockDentalConditionsRepository } from './dental-conditions-mock.repository';

async function errorOf(p: Promise<unknown>): Promise<HttpErrorResponse> {
  try {
    await p;
  } catch (err) {
    return err as HttpErrorResponse;
  }
  throw new Error('se esperaba un error');
}

// El mock debe imitar el contrato del backend (lo usan la pantalla en demo y tests).
describe('MockDentalConditionsRepository', () => {
  let repo: MockDentalConditionsRepository;

  beforeEach(() => (repo = new MockDentalConditionsRepository()));

  it('list: globales primero y luego propias, cada grupo por code', async () => {
    const list = await firstValueFrom(repo.list());
    const globals = list.filter(c => c.tenant_id === null).map(c => c.code);
    expect(globals).toEqual([...globals].sort());
    expect(list.findIndex(c => c.tenant_id !== null)).toBe(globals.length);
    expect(Object.keys(list[0]).sort()).toEqual(['category', 'code', 'default_color', 'id', 'name', 'tenant_id']);
  });

  it('create: normaliza code (minúsculas) y color (mayúsculas); queda como propia', async () => {
    const created = await firstValueFrom(repo.create({ code: ' Fractura_1 ', name: ' Fractura ', default_color: '#ab12cd' }));
    expect(created).toEqual(expect.objectContaining({
      tenant_id: MOCK_DENTAL_TENANT_ID, code: 'fractura_1', name: 'Fractura', category: null, default_color: '#AB12CD',
    }));
    expect(await firstValueFrom(repo.list())).toContainEqual(created);
  });

  it('create: code igual a uno global es válido (override); repetido entre las propias → 409', async () => {
    await firstValueFrom(repo.create({ code: 'caries', name: 'Caries propia' }));
    const err = await errorOf(firstValueFrom(repo.create({ code: 'caries', name: 'Otra' })));
    expect(err.status).toBe(409);
    expect(err.error.detail).toContain("code 'caries' already exists");
  });

  it('create: validaciones 422 con los textos del backend', async () => {
    const cases: [Parameters<MockDentalConditionsRepository['create']>[0], string][] = [
      [{ code: '', name: 'x' }, "Code is required. (Parameter 'value')"],
      [{ code: 'a'.repeat(51), name: 'x' }, "Code cannot exceed 50 characters. (Parameter 'value')"],
      [{ code: 'con-guion', name: 'x' }, "Code must contain only lowercase letters, digits and underscores. (Parameter 'value')"],
      [{ code: 'ok', name: '  ' }, "Name is required. (Parameter 'name')"],
      [{ code: 'ok', name: 'x', default_color: 'rojo' }, "Color must be a hex value in the form #RRGGBB. (Parameter 'value')"],
    ];
    for (const [dto, detail] of cases) {
      const err = await errorOf(firstValueFrom(repo.create(dto)));
      expect(err.status).toBe(422);
      expect(err.error.detail).toBe(detail);
    }
  });

  it('update: global → 403; inexistente → 404', async () => {
    expect((await errorOf(firstValueFrom(repo.update('dc-1', { name: 'X' })))).status).toBe(403);
    expect((await errorOf(firstValueFrom(repo.update('nope', { name: 'X' })))).status).toBe(404);
  });

  it('update: PATCH parcial; null en category/default_color quita el valor; code no cambia', async () => {
    const updated = await firstValueFrom(repo.update('dc-own-1', { category: null, default_color: null }));
    expect(updated).toEqual(expect.objectContaining({
      code: 'sellante', name: 'Sellante', category: null, default_color: null,
    }));
  });
});
