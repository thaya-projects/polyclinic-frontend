import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthTokenService } from '../services/auth-token.service';
import { SessionService } from '../services/session.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor — sesión expirada', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let tokens: AuthTokenService;
  let logouts: number;

  beforeEach(() => {
    logouts = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        // logout real borra los tokens en el acto; el resto (router, POST /auth/logout) no importa acá.
        { provide: SessionService, useValue: { logout: () => { logouts++; tokens.clear(); } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    tokens = TestBed.inject(AuthTokenService);
    tokens.save({ access_token: 'expired', refresh_token: 'refresh-viejo' } as never);
  });

  afterEach(() => {
    tokens.clear();
    http.verify();
  });

  it('varios requests concurrentes con 401 y refresh fallido: un solo toast y un solo logout', () => {
    const urls = ['/a', '/b', '/c'].map(p => `${environment.apiUrl}/tenants${p}`);
    urls.forEach(url => client.get(url).subscribe({ error: () => {} }));

    urls.forEach(url => http.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' }));
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });

    const errors = TestBed.inject(ToastService).toasts().filter(t => t.tone === 'error');
    expect(errors.map(t => t.message)).toEqual(['Tu sesión expiró. Iniciá sesión de nuevo.']);
    expect(logouts).toBe(1);
  });
});
