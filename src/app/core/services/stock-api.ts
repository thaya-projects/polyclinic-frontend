import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateStockMovementDto, StockMovement, StockSummary, TransferStockDto, TransferStockResult } from '../models/stock.model';

// Capa HTTP pura — sin estado. StockService la consume.
@Injectable({ providedIn: 'root' })
export class StockApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tenants/stock`;

  getSummary(): Observable<StockSummary> {
    return this.http.get<StockSummary>(`${this.base}/summary`);
  }

  createMovement(dto: CreateStockMovementDto): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${this.base}/movements`, dto);
  }

  transfer(dto: TransferStockDto): Observable<TransferStockResult> {
    return this.http.post<TransferStockResult>(`${this.base}/transfer`, dto);
  }
}
