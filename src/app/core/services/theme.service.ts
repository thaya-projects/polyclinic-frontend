import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  dark = signal<boolean>(
    isPlatformBrowser(this.platformId) ? localStorage.getItem('theme') === 'dark' : false
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.toggle('dark', this.dark());
    }
  }

  toggle() {
    this.dark.update(d => !d);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', this.dark() ? 'dark' : 'light');
      document.body.classList.toggle('dark', this.dark());
    }
  }
}
