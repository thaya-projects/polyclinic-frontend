import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { CreateStockMovementDto, StockMovement, StockSummary, TransferStockDto, TransferStockResult } from '../models/stock.model';
import { StockApi } from './stock-api';
import { stockSummaryErrorMessage } from '../../shared/utils/stock-error.util';

const EMPTY_SUMMARY: StockSummary = { by_branch: [], total_clinic: [] };

@Injectable({ providedIn: 'root' })
export class StockService {
  private api = inject(StockApi);
  private platformId = inject(PLATFORM_ID);

  private readonly summarySignal = signal<StockSummary>(EMPTY_SUMMARY);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly summary = this.summarySignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // GET /tenants/stock/summary — no corre en SSR: depende del token del navegador.
  loadSummary(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getSummary().subscribe({
      next: res => {
        this.summarySignal.set(res);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(stockSummaryErrorMessage(err));
      },
    });
  }

  // POST /tenants/stock/movements — el stock es un agregado calculado server-side: tras guardar,
  // se vuelve a pedir el summary en vez de intentar actualizarlo local.
  registerMovement(dto: CreateStockMovementDto): Observable<StockMovement> {
    return this.api.createMovement(dto).pipe(tap(() => this.loadSummary()));
  }

  // POST /tenants/stock/transfer — mismo criterio que registerMovement().
  transferStock(dto: TransferStockDto): Observable<TransferStockResult> {
    return this.api.transfer(dto).pipe(tap(() => this.loadSummary()));
  }
}
