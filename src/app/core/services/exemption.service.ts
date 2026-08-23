import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CreateExemptionRequest, PaymentExemptionDto } from '../models/exemption.model';
import { PagedResult } from '../models/clinic.model';

let nextId = 100;

const INITIAL_EXEMPTIONS: PaymentExemptionDto[] = [
  {
    exemptionId: 'ex-1', consultationId: 'c6', patientName: 'Pedro Torrez', doctorName: 'Dr. Roberto Vargas',
    originalFee: 250, reason: 'Paciente de bajos recursos', authorizedByName: 'Carlos Medina',
    authorizedAt: '2026-08-10T00:00:00Z',
  },
];

@Injectable({ providedIn: 'root' })
export class ExemptionService {
  private exemptions = signal<PaymentExemptionDto[]>(INITIAL_EXEMPTIONS);

  createExemption(req: CreateExemptionRequest): Observable<PaymentExemptionDto> {
    const exemption: PaymentExemptionDto = {
      exemptionId: `ex-${nextId++}`,
      consultationId: req.consultationId,
      patientName: 'Paciente demo',
      doctorName: 'Dr. Roberto Vargas',
      originalFee: 250,
      reason: req.reason,
      authorizedByName: 'Carlos Medina',
      authorizedAt: new Date().toISOString(),
    };
    this.exemptions.update(list => [...list, exemption]);
    return of(exemption).pipe(delay(400));
  }

  getExemptions(
    _clinicId?: string,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<PaymentExemptionDto>> {
    const all = this.exemptions();
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    const result: PagedResult<PaymentExemptionDto> = {
      items,
      totalCount: all.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
      hasNextPage: start + pageSize < all.length,
      hasPreviousPage: page > 1,
    };
    return of(result).pipe(delay(300));
  }
}
