import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthStore } from './auth.store';
import { AuthApiService } from '../http/auth-api.service';
import { UserRole } from '../models/auth.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return (route, state) => {
    const authStore = inject(AuthStore);
    const authApi = inject(AuthApiService);
    const router = inject(Router);

    const checkRole = (role: UserRole | null) => {
      if (role && allowedRoles.includes(role)) {
        return true;
      }
      // Forbidden: redirect to public events page without logging out or redirecting to login
      return router.createUrlTree(['/events'], {
        queryParams: { forbidden: '1' },
      });
    };

    if (authStore.isAuthenticated()) {
      return checkRole(authStore.userRole());
    }

    const storedRefreshToken = authStore.refreshToken();
    if (storedRefreshToken && !authStore.accessToken()) {
      return authApi.refresh(storedRefreshToken).pipe(
        switchMap((tokens) => {
          authStore.setTokens(tokens);
          return authApi.getMe().pipe(
            map(({ user }) => {
              authStore.setUser(user);
              return checkRole(user.role);
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
};
