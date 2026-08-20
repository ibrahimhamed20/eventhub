import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthStore } from '../auth/auth.store';
import { AuthApiService } from './auth-api.service';
import { TokenRefreshResponse } from '../models/auth.model';

/**
 * Shared state for serializing concurrent token refresh operations
 */
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authStore = inject(AuthStore);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  const token = authStore.accessToken();

  // Attach access token if present
  let authReq = req;
  if (token && !req.headers.has('Authorization')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Track Rate Limits (429)
        if (error.status === 429) {
          const resetHeader = error.headers.get('RateLimit-Reset');
          let cooldownSec = 60;
          if (resetHeader) {
            const parsed = parseInt(resetHeader, 10);
            if (!isNaN(parsed)) {
              cooldownSec = parsed > 1000000000 ? Math.max(1, Math.round((parsed * 1000 - Date.now()) / 1000)) : parsed;
            }
          }
          authStore.setRateLimitCooldown(cooldownSec);
        }

        // Handle Unauthenticated (401)
        if (error.status === 401) {
          const isAuthEndpoint =
            req.url.includes('/api/v1/auth/login') ||
            req.url.includes('/api/v1/auth/register') ||
            req.url.includes('/api/v1/auth/refresh');

          // Do not attempt refresh on auth endpoints themselves
          if (isAuthEndpoint) {
            if (req.url.includes('/api/v1/auth/refresh')) {
              authStore.logout();
              router.navigate(['/login']);
            }
            return throwError(() => error);
          }

          const storedRefreshToken = authStore.refreshToken();
          if (!storedRefreshToken) {
            authStore.logout();
            router.navigate(['/login']);
            return throwError(() => error);
          }

          if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenSubject.next(null);

            return authApi.refresh(storedRefreshToken).pipe(
              switchMap((tokens: TokenRefreshResponse) => {
                isRefreshing = false;
                authStore.setTokens(tokens);
                refreshTokenSubject.next(tokens.accessToken);

                // Retry original request with freshly rotated access token
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                  },
                });
                return next(retriedReq);
              }),
              catchError((refreshErr) => {
                isRefreshing = false;
                refreshTokenSubject.next(null);
                authStore.logout();
                router.navigate(['/login']);
                return throwError(() => refreshErr);
              })
            );
          } else {
            // Queue concurrent requests: wait until the single ongoing refresh emits the new access token
            return refreshTokenSubject.pipe(
              filter((newToken): newToken is string => newToken !== null),
              take(1),
              switchMap((newToken) => {
                const retriedReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                });
                return next(retriedReq);
              })
            );
          }
        }
      }

      return throwError(() => error);
    })
  );
};
