import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { applyServerError, extractServerError, knownServerMessage } from './server-errors.util';
import { validationErrorMessage } from './http-error.util';

const err = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

// Cuerpos reales del backend (probados contra la API local).
describe('server-errors.util', () => {
  it('400 de model binding: ignora "request" y nombra el campo con un motivo según su tipo', () => {
    const body = { errors: { request: ['The request field is required.'], '$.sex': ['The JSON value could not be converted to X. Path: $.sex'] } };
    expect(extractServerError(err(400, body))).toEqual({ field: 'sex', message: 'Elegí una de las opciones de la lista.' });
    expect(validationErrorMessage(err(400, { errors: { request: ['x'], '$.birth_date': ['The JSON value could not be converted'] } })))
      .toBe('Fecha de nacimiento: Ingresá una fecha válida.');
  });

  it('409 de código repetido marca el input `code` con el motivo', () => {
    const form = new FormGroup({ code: new FormControl('cardiologia'), name: new FormControl('X') });
    const e = err(409, { detail: "A specialty with code 'cardiologia' already exists for tenant 't'." });
    expect(applyServerError(form, e)).toBe(true);
    expect(form.controls.code.errors?.['server']).toBe('Ya existe una especialidad con el código "cardiologia".');
  });

  it('404 de una entidad elegida nombra cuál y su campo', () => {
    const e = err(404, { detail: "Specialty with id '1' was not found." });
    expect(extractServerError(e)?.field).toBe('specialty_id');
    expect(validationErrorMessage(e)).toBe('La especialidad seleccionada ya no existe (puede haber sido eliminada).');
  });

  it('reglas de negocio sin campo: texto propio en español', () => {
    expect(knownServerMessage(err(409, { detail: "Invoice 'x' cannot be issued because it has no items." })))
      .toBe('La factura no tiene ítems: agregá al menos uno antes de emitirla.');
    expect(knownServerMessage(err(409, { detail: "Payment of 99999 exceeds the remaining balance of 230,00 for invoice 'x'." })))
      .toBe('El monto (99999) supera el saldo pendiente de la factura (230,00).');
    expect(knownServerMessage(err(409, { detail: "Appointment cannot transition from 'Completed' to 'Scheduled'." })))
      .toBe('Una cita completada no puede pasar a programada.');
  });

  it('VO con ParamName "value": infiere el campo del mensaje', () => {
    expect(validationErrorMessage(err(422, { detail: "BranchId cannot be empty. (Parameter 'value')" })))
      .toBe('Sucursal: Este campo es obligatorio.');
    expect(extractServerError(err(422, { detail: "CurrencyCode must be a 3-letter ISO 4217 code. (Parameter 'value')" }))?.field)
      .toBe('currency');
  });

  it('nunca usa "dto"/"request" como campo', () => {
    const e = err(422, { detail: "Email is required when CreateLoginAccount is true. (Parameter 'dto')", field: 'dto' });
    expect(extractServerError(e)).toEqual({ field: 'email', message: 'Para crear una cuenta de acceso, el correo es obligatorio.', named: true });
  });

  it('404/409 desconocidos no se traducen acá (el caller usa su texto por status)', () => {
    expect(extractServerError(err(409, { detail: "Unique constraint 'ix' was violated." }))).toBeNull();
    expect(knownServerMessage(err(404, { detail: 'Something else.' }))).toBeNull();
  });
});
