import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  readonly title = signal('Panel');

  set(title: string): void {
    this.title.set(title);
  }
}
