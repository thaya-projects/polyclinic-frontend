import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { InboundMessagesApi } from './inbound-messages-api';
import { InboundMessage, InboundMessagesQuery } from '../models/inbound-message.model';
import { inboundMessagesListErrorMessage } from '../../shared/utils/inbound-messages-error.util';

// Solo lectura (criterio de aceptación de T4, sigue valiendo acá) — sin
// create()/update(), no se responde ni se confirma una cita desde esta UI.
@Injectable({ providedIn: 'root' })
export class InboundMessagesService {
  private api = inject(InboundMessagesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<InboundMessage[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  load(query: InboundMessagesQuery): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll(query).subscribe({
      next: messages => {
        this.records.set(messages);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(inboundMessagesListErrorMessage(err));
      },
    });
  }
}
