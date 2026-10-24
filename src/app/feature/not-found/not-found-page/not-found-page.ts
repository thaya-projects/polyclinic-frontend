import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Ruta wildcard ('**', última entry de app.routes.ts) — sin esto, el
// Angular Router no resuelve nada para una URL desconocida y el SSR cae
// al 404 genérico de Express ("Cannot GET ..."), en vez de mostrar una
// página propia de la app.
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
