import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SuperAdminLoginForm } from './superadmin-login-form';
import { SuperAdminAuthService } from '../../../core/services/superadmin-auth.service';
import { SuperAdminLoginDto } from '../../../core/models/auth.model';
import { loginErrorMessage } from '../../../shared/utils/http-error.util';
import { homeRouteForUser } from '../../../core/constants/role-routes.const';

@Component({
  selector: 'app-superadmin-login-page',
  imports: [SuperAdminLoginForm, RouterLink],
  templateUrl: './superadmin-login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminLoginPage {
  private authSvc = inject(SuperAdminAuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // POST /auth/superadmin/login
  onSubmit(dto: SuperAdminLoginDto): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authSvc.login(dto).subscribe({
      next: res => {
        this.loading.set(false);
        this.router.navigateByUrl(homeRouteForUser(res.user));
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(loginErrorMessage(err));
      },
    });
  }
}
