import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './shared/components/toast-container/toast-container';
import { SessionLoadingOverlay } from './shared/components/session-loading-overlay/session-loading-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, SessionLoadingOverlay],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('polyclinic-frontend');
}
