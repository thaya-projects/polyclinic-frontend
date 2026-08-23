import { Injectable, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { PendingFeeApproval, UpdateFeesRequest } from '../models/fee.model';

const INITIAL_APPROVALS: PendingFeeApproval[] = [
  { userId: 'usr-3', doctorName: 'Dr. Marco Huanca', specialtyName: 'Neurología', clinicName: 'Clínica MedConnect', consultationFee: 260, videoFee: 210, updatedAt: '2026-08-20T00:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class FeeService {
  private approvals = signal<PendingFeeApproval[]>(INITIAL_APPROVALS);

  getPendingApprovals(_clinicId?: string): Observable<PendingFeeApproval[]> {
    return of(this.approvals()).pipe(delay(300));
  }

  updateFees(userId: string, req: UpdateFeesRequest): Observable<unknown> {
    this.approvals.update(list =>
      list.map(a => (a.userId === userId ? { ...a, consultationFee: req.consultationFee, videoFee: req.videoFee } : a)),
    );
    return of({}).pipe(delay(300));
  }

  approveFees(userId: string): Observable<unknown> {
    this.approvals.update(list => list.filter(a => a.userId !== userId));
    return of({}).pipe(delay(300));
  }
}
