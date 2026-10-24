import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { ImpersonationBanner } from '../impersonation-banner/impersonation-banner';
import { FeaturesService } from '../../core/services/features.service';

@Component({
  selector: 'app-shell',
  imports: [Sidebar, Header, ImpersonationBanner, RouterOutlet],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  constructor() {
    // T6 FF: hidrata el mapa de features del user logueado apenas entra al Shell. Si es super
    // admin (sin tenant), el service maneja el 403 silenciosamente y deja el mapa vacío —
    // los menús gated (moduleKey) quedan ocultos, que es el default correcto para super admin.
    inject(FeaturesService).loadMine();
  }
}
