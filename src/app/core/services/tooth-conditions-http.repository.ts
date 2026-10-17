import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ToothConditionsApi } from './tooth-conditions-api';
import { FeaturesService } from './features.service';
import type { ToothConditionsRepository } from './tooth-conditions-repository';
import {
  CreateToothConditionDto, ToothCondition, UpdateToothConditionDto,
} from '../models/tooth-condition.model';

// Fase 6 T6: implementación real contra el backend (default de TOOTH_CONDITIONS_REPOSITORY).
@Injectable({ providedIn: 'root' })
export class HttpToothConditionsRepository implements ToothConditionsRepository {
  private api = inject(ToothConditionsApi);
  private features = inject(FeaturesService);

  list(odontogramId: string): Observable<ToothCondition[]> {
    return this.api.list(odontogramId);
  }

  create(odontogramId: string, dto: CreateToothConditionDto): Observable<ToothCondition> {
    return this.api.create(odontogramId, dto);
  }

  update(odontogramId: string, toothConditionId: string, dto: UpdateToothConditionDto): Observable<ToothCondition> {
    return this.api.update(odontogramId, toothConditionId, dto);
  }

  remove(odontogramId: string, toothConditionId: string): Observable<void> {
    return this.api.remove(odontogramId, toothConditionId);
  }

  // GET /tenants/me/features (lo carga el Shell). null mientras no haya respuesta.
  odontogramEnabled(): boolean | null {
    return this.features.loaded() ? this.features.enabled('odontogram') : null;
  }
}
