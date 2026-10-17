import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DentalConditionsApi } from './dental-conditions-api';
import { FeaturesService } from './features.service';
import type { DentalConditionsRepository } from './dental-conditions-repository';
import {
  CreateDentalConditionDto, DentalCondition, UpdateDentalConditionDto,
} from '../models/dental-condition.model';

// Fase 6 T6: implementación real contra el backend (default de DENTAL_CONDITIONS_REPOSITORY).
@Injectable({ providedIn: 'root' })
export class HttpDentalConditionsRepository implements DentalConditionsRepository {
  private api = inject(DentalConditionsApi);
  private features = inject(FeaturesService);

  list(): Observable<DentalCondition[]> {
    return this.api.list();
  }

  create(dto: CreateDentalConditionDto): Observable<DentalCondition> {
    return this.api.create(dto);
  }

  update(id: string, dto: UpdateDentalConditionDto): Observable<DentalCondition> {
    return this.api.update(id, dto);
  }

  // GET /tenants/me/features (lo carga el Shell). null mientras no haya respuesta.
  odontogramEnabled(): boolean | null {
    return this.features.loaded() ? this.features.enabled('odontogram') : null;
  }
}
