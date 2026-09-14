import { Injectable, computed, inject } from '@angular/core';
import { AuthStore } from './auth-store.service';

// Deriva el rol del usuario logueado real (T15) en vez del mock fijo que
// usaba antes de tener AuthStore.
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private store = inject(AuthStore);

  readonly role = computed(() => this.store.user()?.role ?? null);
}
