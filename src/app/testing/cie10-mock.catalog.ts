import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import type { Cie10Catalog } from '../core/services/cie10-catalog';
import { CIE10_SEARCH, Cie10Entry } from '../core/models/diagnosis.model';

// Muestra del catálogo CIE-10 (global, igual para todos los tenants).
export const MOCK_CIE10: Cie10Entry[] = [
  { code: 'A09', description: 'Diarrea y gastroenteritis de presunto origen infeccioso' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones' },
  { code: 'E66.9', description: 'Obesidad, no especificada' },
  { code: 'E78.5', description: 'Hiperlipidemia, no especificada' },
  { code: 'F32.9', description: 'Episodio depresivo, no especificado' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada' },
  { code: 'G43.9', description: 'Migraña, no especificada' },
  { code: 'G44.2', description: 'Cefalea debida a tensión' },
  { code: 'I10', description: 'Hipertensión esencial (primaria)' },
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)' },
  { code: 'J02.9', description: 'Faringitis aguda, no especificada' },
  { code: 'J03.9', description: 'Amigdalitis aguda, no especificada' },
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores, no especificada' },
  { code: 'J18.9', description: 'Neumonía, no especificada' },
  { code: 'J45.9', description: 'Asma, no especificada' },
  { code: 'K21.9', description: 'Enfermedad del reflujo gastroesofágico sin esofagitis' },
  { code: 'K29.7', description: 'Gastritis, no especificada' },
  { code: 'M54.5', description: 'Lumbago no especificado' },
  { code: 'N39.0', description: 'Infección de vías urinarias, sitio no especificado' },
  { code: 'R05', description: 'Tos' },
  { code: 'R50.9', description: 'Fiebre, no especificada' },
  { code: 'R51', description: 'Cefalea' },
  { code: 'Z00.0', description: 'Examen médico general' },
];

// Formato de Cie10Code del backend (tras trim + mayúsculas): letra + 2 dígitos y, opcionalmente,
// punto + 1–4 alfanuméricos; máximo 8 caracteres.
export const CIE10_CODE_FORMAT = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;
export const CIE10_CODE_MAX_LENGTH = 8;

// Sin tildes ni mayúsculas, para buscar "migrana" o "MIGRAÑA" igual.
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Fase 4 T5: catálogo CIE-10 en memoria para demo/tests (NO providedIn root: se provee a mano con
// { provide: CIE10_CATALOG, useClass: MockCie10Catalog }). Imita a Cie10Service/Cie10SearchQuery:
//   q recortado < 2 o > 100 → 422 (mensajes de ArgumentException, con el sufijo "(Parameter 'q')");
//   limit acotado a 1..50 (default 20); sin chequeo de acceso (catálogo global);
//   orden: código exacto, prefijo de código, luego descripción — cada grupo ordenado por código.
@Injectable()
export class MockCie10Catalog implements Cie10Catalog {
  search(q: string, limit: number = CIE10_SEARCH.defaultLimit): Observable<Cie10Entry[]> {
    const trimmed = (q ?? '').trim();
    if (trimmed.length < CIE10_SEARCH.minChars) {
      return argumentError(`q must have at least ${CIE10_SEARCH.minChars} characters.`, 'q');
    }
    if (trimmed.length > CIE10_SEARCH.maxChars) {
      return argumentError(`q cannot exceed ${CIE10_SEARCH.maxChars} characters.`, 'q');
    }
    const term = normalize(trimmed);
    const max = Math.min(Math.max(1, limit), CIE10_SEARCH.maxLimit);
    const byCode = (a: Cie10Entry, b: Cie10Entry) => a.code.localeCompare(b.code);
    const exact = MOCK_CIE10.filter(c => normalize(c.code) === term);
    const prefix = MOCK_CIE10.filter(c => normalize(c.code) !== term && normalize(c.code).startsWith(term));
    const byDescription = MOCK_CIE10.filter(c =>
      !normalize(c.code).startsWith(term) && normalize(c.description).includes(term));
    return of([...exact.sort(byCode), ...prefix.sort(byCode), ...byDescription.sort(byCode)]
      .slice(0, max)
      .map(c => ({ ...c })));
  }
}

// ArgumentException de .NET → 422 con " (Parameter 'x')" al final del detail, como el backend.
export function argumentError(message: string, parameter: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({
    status: 422, error: { detail: `${message} (Parameter '${parameter}')` },
  }));
}
