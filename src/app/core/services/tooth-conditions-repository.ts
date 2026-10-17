import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateToothConditionDto, ToothCondition, UpdateToothConditionDto,
} from '../models/tooth-condition.model';
import { MockToothConditionsRepository } from '../../testing/tooth-conditions-mock.repository';

// Fase 6 T5: abstracción de las condiciones marcadas por pieza en un odontograma. Las pantallas solo
// conocen este contrato (vía TOOTH_CONDITIONS_REPOSITORY), nunca HttpClient ni el mock.
//
// Endpoints del backend (a conectar en T6 con HttpToothConditionsRepository):
//   GET    /tenants/odontograms/{odontogramId}/teeth
//   POST   /tenants/odontograms/{odontogramId}/teeth                       body CreateToothConditionDto
//   PATCH  /tenants/odontograms/{odontogramId}/teeth/{toothConditionId}    body UpdateToothConditionDto
//   DELETE /tenants/odontograms/{odontogramId}/teeth/{toothConditionId}
//
// Los errores viajan como HttpErrorResponse en ambas implementaciones (el mock los fabrica con el
// mismo status que el backend), para que el manejo de 401/403/404/422 sea uno solo (odontogram-error.util).
export interface ToothConditionsRepository {
  // Todas las condiciones marcadas del odontograma (todas las piezas), por created_at.
  list(odontogramId: string): Observable<ToothCondition[]>;
  // tooth_fdi fuera de la dentición del odontograma / surface / state inválidos → 422.
  create(odontogramId: string, dto: CreateToothConditionDto): Observable<ToothCondition>;
  // Inexistente o de otro odontograma → 404; surface / state inválidos → 422.
  update(odontogramId: string, toothConditionId: string, dto: UpdateToothConditionDto): Observable<ToothCondition>;
  // Inexistente o de otro odontograma → 404.
  remove(odontogramId: string, toothConditionId: string): Observable<void>;

  // Estado del módulo "odontogram" para la sesión (null = todavía desconocido). Sirve de respaldo
  // cuando el 403 del módulo apagado llega sin body (ver odontogram-error.util).
  odontogramEnabled(): boolean | null;
}

// T5: el backend de /teeth todavía no está, así que el default es el mock en memoria. Conectar el
// backend = agregar HttpToothConditionsRepository (core/services) y cambiar este factory por
// `() => inject(HttpToothConditionsRepository)`, sin tocar componentes.
export const TOOTH_CONDITIONS_REPOSITORY = new InjectionToken<ToothConditionsRepository>(
  'TOOTH_CONDITIONS_REPOSITORY',
  { providedIn: 'root', factory: () => new MockToothConditionsRepository() },
);
