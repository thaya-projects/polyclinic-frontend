import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ServiceCategory } from '../models/service-category.model';
import { ServiceCategoriesApi } from './service-categories-api';
import { servicesListErrorMessage } from '../../shared/utils/services-error.util';

@Injectable({ providedIn: 'root' })
export class ServiceCategoriesService {
  private api = inject(ServiceCategoriesApi);
  private platformId = inject(PLATFORM_ID);

  private readonly records = signal<ServiceCategory[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getAll() {
    return this.records.asReadonly();
  }

  // GET /tenants/service-categories — no corre en SSR: depende del token del navegador.
  load(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.api.getAll().subscribe({
      next: categories => {
        this.records.set(categories);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.errorSignal.set(servicesListErrorMessage(err));
      },
    });
  }
}
