import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult } from '../models/paged-result.model';
import { CreateMeasurementDto, CreatedMeasurement, Measurement, MeasurementType, MeasurementsQuery } from '../models/measurement.model';
import { MeasurementsApi } from './measurements-api';

// Fase 4 T3/T4: abstracción de la fuente de datos de signos vitales (repositorio PROPIO, separado de
// ENCOUNTERS_REPOSITORY: las mediciones son del paciente y el encounter es opcional). Las pantallas
// solo conocen este contrato; T3 corre con MockMeasurementsRepository y T4 enchufa MeasurementsApi.
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status y detail que el backend).
//
// Reglas del backend:
//   leer: profesional activo o clinical.void (si no, 403); paciente de otro tenant → 404.
//   registrar: el actor tiene que ser profesional activo del tenant (no profesional 403, inactivo
//     422) — se chequea ANTES de buscar el encounter (su 404 viene después).
//   registrar con encounter_id: solo el profesional del encounter (403), encounter open (409) y del
//     mismo paciente (422); encounter de otro tenant → 404. Incrementa la version del encounter.
//   tipo conocido: unidad distinta de la canónica (o de sus alias, ej. "ºC"/"C") o valor fuera del
//     rango del catálogo → 422; sin unidad usa la canónica. Tipos libres ^[a-z][a-z0-9_]{1,49}$ con
//     unidad libre y OBLIGATORIA (≤ 20).
//   listado: from/to con offset o Z (si no 422), from > to → 422; type con formato inválido → 422.
//   measured_at con offset, no futuro (> 5 min) ni anterior a 1900; note ≤ 1000.
//   No hay edición ni borrado.
export interface MeasurementsRepository {
  list(patientId: string, query: MeasurementsQuery): Observable<PagedResult<Measurement>>;
  create(patientId: string, dto: CreateMeasurementDto): Observable<CreatedMeasurement>;
  // Catálogo de tipos conocidos (unidad canónica + rango).
  listTypes(): Observable<MeasurementType[]>;
}

// HTTP por defecto. Para demo/tests:
//   providers: [{ provide: MEASUREMENTS_REPOSITORY, useClass: MockMeasurementsRepository }]
//   (src/app/testing/measurements-mock.repository.ts; comparte sesión/encounters con
//   MockEncountersRepository a través de MockClinicalBackend).
export const MEASUREMENTS_REPOSITORY = new InjectionToken<MeasurementsRepository>('MEASUREMENTS_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(MeasurementsApi),
});
