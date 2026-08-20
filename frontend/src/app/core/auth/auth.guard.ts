import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthStore } from './auth.store';
import { AuthApiService } from '../http/auth-api.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  const storedRefreshToken = authStore.refreshToken();
  if (storedRefreshToken && !authStore.accessToken()) {
    // Attempt silent restore on initial page load / direct link navigation
    return authApi.refresh(storedRefreshToken).pipe(
      switchMap((tokens) => {
        authStore.setTokens(tokens);
        return authApi.getMe().pipe(
          map(({ user }) => {
            authStore.setUser(user);
            return true;
          })
        );
      }),
      catchError(() => {
        authStore.logout();
        return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
      })
    );
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
