import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateToothConditionDto, ToothCondition, UpdateToothConditionDto,
} from '../models/tooth-condition.model';
import { HttpToothConditionsRepository } from './tooth-conditions-http.repository';

// Fase 6 T5: abstracción de las condiciones marcadas por pieza en un odontograma. Las pantallas solo
// conocen este contrato (vía TOOTH_CONDITIONS_REPOSITORY), nunca HttpClient ni el mock.
//
// Endpoints del backend (HttpToothConditionsRepository → ToothConditionsApi):
//   GET    /tenants/odontograms/{odontogramId}/teeth
//   POST   /tenants/odontograms/{odontogramId}/teeth                       body CreateToothConditionDto
//   PATCH  /tenants/odontograms/{odontogramId}/teeth/{toothConditionId}    body UpdateToothConditionDto
//   DELETE /tenants/odontograms/{odontogramId}/teeth/{toothConditionId}    → 204
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status que el backend), para que el manejo de 401/403/404/409/422 sea uno solo (odontogram-error.util).
// Odontograma inexistente / de otro tenant → 404 en todas las operaciones. Escribir en un odontograma
// histórico (is_current = false) → 409.
export interface ToothConditionsRepository {
  // Todas las condiciones marcadas del odontograma (todas las piezas), por created_at.
  list(odontogramId: string): Observable<ToothCondition[]>;
  // tooth_fdi no FDI o fuera de la dentición del odontograma / condition_id inexistente / surface / state
  // inválidos → 422.
  create(odontogramId: string, dto: CreateToothConditionDto): Observable<ToothCondition>;
  // Inexistente o de otro odontograma → 404; surface / state inválidos → 422.
  update(odontogramId: string, toothConditionId: string, dto: UpdateToothConditionDto): Observable<ToothCondition>;
  // Inexistente o de otro odontograma → 404.
  remove(odontogramId: string, toothConditionId: string): Observable<void>;

  // Estado del módulo "odontogram" para la sesión (null = todavía desconocido). Sirve de respaldo
  // cuando el 403 del módulo apagado llega sin body (ver odontogram-error.util).
  odontogramEnabled(): boolean | null;
}

// T6: la implementación HTTP es la default. Para correr contra el mock (demo/tests):
//   providers: [{ provide: TOOTH_CONDITIONS_REPOSITORY, useClass: MockToothConditionsRepository }]
//   (MockToothConditionsRepository vive en src/app/testing/).
export const TOOTH_CONDITIONS_REPOSITORY = new InjectionToken<ToothConditionsRepository>(
  'TOOTH_CONDITIONS_REPOSITORY',
  { providedIn: 'root', factory: () => inject(HttpToothConditionsRepository) },
);
