import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { AuthStore } from './core/auth/auth.store';
import { AuthApiService } from './core/http/auth-api.service';
import { firstValueFrom } from 'rxjs';

/**
 * Initializes authentication state from stored refresh token on application bootstrap
 */
export function initializeAuth(): () => Promise<void> {
  const authStore = inject(AuthStore);
  const authApi = inject(AuthApiService);

  return async () => {
    const storedRefreshToken = authStore.refreshToken();
    if (!storedRefreshToken) {
      return;
    }

    try {
      // Perform silent refresh on app startup
      const tokens = await firstValueFrom(authApi.refresh(storedRefreshToken));
      authStore.setTokens(tokens);

      const { user } = await firstValueFrom(authApi.getMe());
      authStore.setUser(user);
    } catch {
      // Invalidation or network error: gracefully clear stale tokens
      authStore.logout();
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false,
        },
      },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};
