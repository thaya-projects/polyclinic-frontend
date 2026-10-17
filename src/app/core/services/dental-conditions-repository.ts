import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto,
} from '../models/dental-condition.model';
import { HttpDentalConditionsRepository } from './dental-conditions-http.repository';

// Fase 6 T5: abstracción de la fuente de datos del catálogo de condiciones dentales. Las pantallas
// solo conocen este contrato (vía DENTAL_CONDITIONS_REPOSITORY), nunca HttpClient ni el mock — así
// T5 corrió con MockDentalConditionsRepository y T6 enchufa HttpDentalConditionsRepository sin
// tocar componentes.
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status y detail que el backend), para que el manejo de 401/403/404/409/422 sea uno solo.
export interface DentalConditionsRepository {
  // Globales (tenant_id null) primero y luego las propias; dentro de cada grupo por code.
  list(): Observable<DentalCondition[]>;
  // Code duplicado entre las propias → 409; code/name/color inválidos → 422.
  create(dto: CreateDentalConditionDto): Observable<DentalCondition>;
  // Global → 403; de otro tenant o inexistente → 404.
  update(id: string, dto: UpdateDentalConditionDto): Observable<DentalCondition>;

  // Estado del módulo "odontogram" para la sesión (null = todavía desconocido). El 403 del módulo
  // apagado llega sin body, igual que el de falta de permiso: con esto la UI los distingue.
  odontogramEnabled(): boolean | null;
}

// T6: la implementación HTTP es la default. Para correr contra el mock (demo/tests):
//   providers: [{ provide: DENTAL_CONDITIONS_REPOSITORY, useClass: MockDentalConditionsRepository }]
//   (MockDentalConditionsRepository vive en src/app/testing/).
export const DENTAL_CONDITIONS_REPOSITORY = new InjectionToken<DentalConditionsRepository>(
  'DENTAL_CONDITIONS_REPOSITORY',
  { providedIn: 'root', factory: () => inject(HttpDentalConditionsRepository) },
);
