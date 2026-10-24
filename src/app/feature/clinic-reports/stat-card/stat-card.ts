import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Tarjeta genérica de número único ("hero number") — el color nunca lo
// lleva el valor en sí (texto siempre en tokens de texto), el ícono es
// el único acento de color, consistente con el resto de la app.
@Component({
  selector: 'app-stat-card',
  imports: [],
  templateUrl: './stat-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input.required<string>();
}
