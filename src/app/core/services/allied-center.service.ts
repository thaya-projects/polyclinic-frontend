import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import {
  CreateAlliedCenterRequest, UpdateAlliedCenterRequest, AlliedCenterDto,
} from '../models/allied-center.model';

let nextId = 100;

const INITIAL_CENTERS: AlliedCenterDto[] = [
  { alliedCenterId: 'ac-1', name: 'Laboratorio Central',    type: 'Laboratory',    city: 'La Paz', phone: '+591 700 11111', isActive: true, totalTechnicians: 3 },
  { alliedCenterId: 'ac-2', name: 'Imágenes Santa Cruz',     type: 'Imaging',       city: 'Santa Cruz', phone: '+591 700 22222', isActive: true, totalTechnicians: 2 },
];

@Injectable({ providedIn: 'root' })
export class AlliedCenterService {
  private centers = signal<AlliedCenterDto[]>(INITIAL_CENTERS);

  createAlliedCenter(req: CreateAlliedCenterRequest): Observable<AlliedCenterDto> {
    const center: AlliedCenterDto = {
      alliedCenterId: `ac-${nextId++}`,
      name: req.name,
      type: req.type,
      city: req.city,
      phone: req.phone,
      isActive: true,
      totalTechnicians: 0,
    };
    this.centers.update(list => [...list, center]);
    return of(center).pipe(delay(400));
  }

  getAlliedCentersByClinic(_clinicId: string): Observable<AlliedCenterDto[]> {
    return of(this.centers()).pipe(delay(300));
  }

  updateAlliedCenter(alliedCenterId: string, req: UpdateAlliedCenterRequest): Observable<unknown> {
    this.centers.update(list =>
      list.map(c => (c.alliedCenterId === alliedCenterId ? { ...c, name: req.name, city: req.city, phone: req.phone } : c)),
    );
    return of({}).pipe(delay(300));
  }

  toggleAlliedCenterStatus(alliedCenterId: string, activate: boolean): Observable<unknown> {
    this.centers.update(list =>
      list.map(c => (c.alliedCenterId === alliedCenterId ? { ...c, isActive: activate } : c)),
    );
    return of({}).pipe(delay(300));
  }
}
