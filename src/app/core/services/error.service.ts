import { Injectable, signal } from '@angular/core';
import { ApiError } from '../models/api-error.model';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly lastError = signal<ApiError | null>(null);

  setError(error: ApiError): void {
    this.lastError.set(error);
    setTimeout(() => this.lastError.set(null), 5000);
  }
}
