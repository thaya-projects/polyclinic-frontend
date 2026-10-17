import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Cie10Entry } from '../models/diagnosis.model';
import { Cie10Api } from './cie10-api';

// Fase 4 T5: abstracción del catálogo CIE-10 (global, no es dato clínico: lo usa cualquier
// usuario del tenant). Separado de ENCOUNTERS_REPOSITORY porque no depende del encounter.
// Los errores viajan como HttpErrorResponse en ambas implementaciones.
export interface Cie10Catalog {
  // q recortado con 2..100 caracteres (si no, 422); limit 20 por defecto, máximo 50.
  // Orden: código exacto, prefijo de código y luego descripción; cada grupo por código.
  search(q: string, limit?: number): Observable<Cie10Entry[]>;
}

// HTTP por defecto. Para demo/tests: { provide: CIE10_CATALOG, useClass: MockCie10Catalog }
// (src/app/testing/cie10-mock.catalog.ts).
export const CIE10_CATALOG = new InjectionToken<Cie10Catalog>('CIE10_CATALOG', {
  providedIn: 'root',
  factory: () => inject(Cie10Api),
});
