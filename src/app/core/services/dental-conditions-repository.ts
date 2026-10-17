import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto,
} from '../models/dental-condition.model';
import { MockDentalConditionsRepository } from '../../testing/dental-conditions-mock.repository';

// Fase 6 T5: abstracción de la fuente de datos del catálogo de condiciones dentales. Las pantallas
// solo conocen este contrato (vía DENTAL_CONDITIONS_REPOSITORY), nunca HttpClient ni el mock — así
// T5 corre con MockDentalConditionsRepository y T6 enchufa la implementación HTTP sin tocar
// componentes.
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status y detail que el backend), para que el manejo de 403/404/409/422 sea uno solo.
export interface DentalConditionsRepository {
  // Globales (tenant_id null) primero y luego las propias; dentro de cada grupo por code.
  list(): Observable<DentalCondition[]>;
  // Code duplicado entre las propias → 409; code/name/color inválidos → 422.
  create(dto: CreateDentalConditionDto): Observable<DentalCondition>;
  // Global → 403; de otro tenant o inexistente → 404.
  update(id: string, dto: UpdateDentalConditionDto): Observable<DentalCondition>;
}

// T5: mientras no exista la implementación HTTP, el default es el mock en memoria.
export const DENTAL_CONDITIONS_REPOSITORY = new InjectionToken<DentalConditionsRepository>(
  'DENTAL_CONDITIONS_REPOSITORY',
  { providedIn: 'root', factory: () => new MockDentalConditionsRepository() },
);
