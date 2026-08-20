import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { User, UserRole, AuthResponse, TokenRefreshResponse } from '../models/auth.model';

const REFRESH_TOKEN_KEY = 'eventhub_refresh_token';

export interface AuthState {
  user: User | null;
  /**
   * Note on Token Storage:
   * The access token is stored in-memory only in this signal (never in localStorage).
   * This mitigates XSS token extraction attacks; memory tokens die on page unload.
   *
   * The refresh token is kept in localStorage solely so that user sessions survive
   * full browser refreshes.
   * Production Security Note: An httpOnly, Secure, SameSite cookie set directly
   * by the backend for refresh tokens would be the more secure production approach
   * to completely insulate tokens from client-side script access.
   */
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  rateLimitCooldownSec: number | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null,
  isLoading: false,
  rateLimitCooldownSec: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user, accessToken, refreshToken }) => ({
    isAuthenticated: computed(() => !!accessToken() && !!user()),
    hasStoredRefreshToken: computed(() => !!refreshToken()),
    userRole: computed<UserRole | null>(() => user()?.role ?? null),
    isOrganizer: computed(() => user()?.role === 'organizer' || user()?.role === 'admin'),
    isAdmin: computed(() => user()?.role === 'admin'),
    currentUserId: computed(() => user()?.id ?? null),
  })),
  withMethods((store) => ({
    setAuth(auth: AuthResponse): void {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
      }
      patchState(store, {
        user: auth.user,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        isLoading: false,
      });
    },

    setTokens(tokens: TokenRefreshResponse): void {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
      patchState(store, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },

    setUser(user: User): void {
      patchState(store, { user });
    },

    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },

    setRateLimitCooldown(seconds: number | null): void {
      patchState(store, { rateLimitCooldownSec: seconds });
    },

    logout(): void {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      patchState(store, {
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
    },
  }))
);
