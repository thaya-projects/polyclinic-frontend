import { Injectable, signal } from '@angular/core';

export type ToastTone = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
}

const DEFAULT_DURATION_MS = 5000;

// Estado global de toasts (T20). ToastContainer (montado una sola vez en
// el root del app) lo lee para renderizar la pila; cualquier service o
// interceptor puede llamar show()/error() sin conocer el componente.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly toastsSignal = signal<ToastMessage[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, tone: ToastTone = 'info', durationMs = DEFAULT_DURATION_MS): void {
    const id = ++this.nextId;
    this.toastsSignal.update(list => [...list, { id, tone, message }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  dismiss(id: number): void {
    this.toastsSignal.update(list => list.filter(t => t.id !== id));
  }
}
