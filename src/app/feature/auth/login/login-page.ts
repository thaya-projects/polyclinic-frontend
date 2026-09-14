import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginForm } from './login-form';
import { LoginDto } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { clinicLoginErrorMessage } from '../../../shared/utils/http-error.util';
import { hasMappedHomeRoute, homeRouteForRole } from '../../../core/constants/role-routes.const';

@Component({
  selector: 'app-login-page',
  imports: [LoginForm],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private authSvc = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // POST /auth/login (T14). Guardar la sesión es T15.
  onSubmit(credentials: LoginDto): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authSvc.login(credentials).subscribe({
      // T18: redirige según el rol si tiene un home mapeado. Hoy app_user
      // (clínica) todavía no tiene panel propio, así que se queda acá con
      // un mensaje de éxito en vez de navegar a ningún lado.
      next: res => {
        this.loading.set(false);
        const role = res.user?.role;
        if (hasMappedHomeRoute(role)) {
          this.router.navigateByUrl(homeRouteForRole(role));
        } else {
          this.successMessage.set('Inicio de sesión correcto.');
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(clinicLoginErrorMessage(err));
      },
    });
  }
}
