import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginForm } from './login-form';
import { LoginDto } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { clinicLoginErrorMessage } from '../../../shared/utils/http-error.util';
import { homeRouteForUser } from '../../../core/constants/role-routes.const';

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

  // POST /auth/login. Todo usuario de clínica (cualquier role.code, o sin
  // roles) aterriza en /appointments — la agenda es el único home de
  // clínica, no hay un dashboard distinto por rol.
  onSubmit(credentials: LoginDto): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authSvc.login(credentials).subscribe({
      next: res => {
        this.loading.set(false);
        this.router.navigateByUrl(homeRouteForUser(res.user));
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(clinicLoginErrorMessage(err));
      },
    });
  }
}
