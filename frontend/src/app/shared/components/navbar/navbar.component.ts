import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthApiService } from '../../../core/http/auth-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Primary Nav -->
          <div class="flex items-center gap-8">
            <a
              routerLink="/events"
              class="flex items-center gap-2.5 font-bold text-xl tracking-tight text-white hover:opacity-90 transition-opacity"
            >
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <i class="pi pi-calendar text-white text-base"></i>
              </div>
              <span class="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Event<span class="text-indigo-400">Hub</span>
              </span>
            </a>

            <nav class="hidden md:flex items-center gap-1">
              <a
                routerLink="/events"
                routerLinkActive="bg-slate-800 text-white"
                [routerLinkActiveOptions]="{ exact: true }"
                class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                Discover
              </a>

              @if (authStore.isAuthenticated()) {
                <a
                  routerLink="/bookings"
                  routerLinkActive="bg-slate-800 text-white"
                  class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  My Bookings
                </a>
              }

              @if (authStore.isOrganizer()) {
                <a
                  routerLink="/organizer"
                  routerLinkActive="bg-slate-800 text-white"
                  [routerLinkActiveOptions]="{ exact: true }"
                  class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Dashboard
                </a>
              }
            </nav>
          </div>

          <!-- Actions / User Section -->
          <div class="hidden md:flex items-center gap-4">
            @if (authStore.isOrganizer()) {
              <a
                routerLink="/organizer/events/new"
                class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <i class="pi pi-plus text-xs"></i>
                <span>Host Event</span>
              </a>
            }

            @if (authStore.isAuthenticated()) {
              <div class="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div class="flex flex-col items-end">
                  <span class="text-xs font-semibold text-white max-w-[140px] truncate">
                    {{ authStore.user()?.fullName }}
                  </span>
                  <span
                    class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded"
                    [ngClass]="{
                      'bg-indigo-950 text-indigo-400 border border-indigo-800': authStore.userRole() === 'organizer',
                      'bg-purple-950 text-purple-400 border border-purple-800': authStore.userRole() === 'admin',
                      'bg-emerald-950 text-emerald-400 border border-emerald-800': authStore.userRole() === 'attendee'
                    }"
                  >
                    {{ authStore.userRole() }}
                  </span>
                </div>

                <button
                  type="button"
                  (click)="onLogout()"
                  aria-label="Log out"
                  class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
                  title="Log out"
                >
                  <i class="pi pi-sign-out text-sm"></i>
                </button>
              </div>
            } @else {
              <div class="flex items-center gap-2">
                <a
                  routerLink="/login"
                  class="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Sign In
                </a>
                <a
                  routerLink="/register"
                  class="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                >
                  Register
                </a>
              </div>
            }
          </div>

          <!-- Mobile Hamburger Toggle -->
          <div class="flex md:hidden">
            <button
              type="button"
              (click)="mobileMenuOpen.set(!mobileMenuOpen())"
              aria-label="Toggle navigation menu"
              class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <i [class]="mobileMenuOpen() ? 'pi pi-times' : 'pi pi-bars'"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      @if (mobileMenuOpen()) {
        <div class="md:hidden border-t border-slate-800 bg-slate-900/95 px-4 pt-2 pb-4 space-y-1 backdrop-blur-xl">
          <a
            routerLink="/events"
            (click)="mobileMenuOpen.set(false)"
            class="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
          >
            Discover Events
          </a>

          @if (authStore.isAuthenticated()) {
            <a
              routerLink="/bookings"
              (click)="mobileMenuOpen.set(false)"
              class="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              My Bookings
            </a>
          }

          @if (authStore.isOrganizer()) {
            <a
              routerLink="/organizer"
              (click)="mobileMenuOpen.set(false)"
              class="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Organizer Dashboard
            </a>
            <a
              routerLink="/organizer/events/new"
              (click)="mobileMenuOpen.set(false)"
              class="block px-3 py-2 rounded-md text-base font-medium text-indigo-400 hover:bg-indigo-950/40"
            >
              + Create New Event
            </a>
          }

          <div class="pt-3 border-t border-slate-800 mt-2">
            @if (authStore.isAuthenticated()) {
              <div class="flex items-center justify-between px-3 py-2">
                <div>
                  <div class="text-sm font-semibold text-white">{{ authStore.user()?.fullName }}</div>
                  <div class="text-xs text-slate-400">{{ authStore.user()?.email }}</div>
                </div>
                <button
                  type="button"
                  (click)="onLogout()"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/80 text-rose-300 border border-rose-800"
                >
                  Log Out
                </button>
              </div>
            } @else {
              <div class="flex flex-col gap-2 px-3 pt-2">
                <a
                  routerLink="/login"
                  (click)="mobileMenuOpen.set(false)"
                  class="w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white"
                >
                  Sign In
                </a>
                <a
                  routerLink="/register"
                  (click)="mobileMenuOpen.set(false)"
                  class="w-full text-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-200 border border-slate-700"
                >
                  Create Account
                </a>
              </div>
            }
          </div>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  readonly authStore = inject(AuthStore);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  mobileMenuOpen = signal(false);

  onLogout(): void {
    const refreshToken = this.authStore.refreshToken();
    this.authApi.logout(refreshToken).subscribe({
      next: () => {
        this.authStore.logout();
        this.mobileMenuOpen.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authStore.logout();
        this.mobileMenuOpen.set(false);
        this.router.navigate(['/login']);
      },
    });
  }
}
