import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersApiService } from '../../../core/http/users-api.service';
import { AnalyticsGraphqlService } from '../../../core/http/analytics-graphql.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { UserSummary } from '../../../core/models/user.model';
import { OrganizerStatsGQL } from '../../../core/models/analytics.model';
import { User } from '../../../core/models/auth.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CentsToDollarsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto space-y-8 pb-16">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">
              System Administration
            </span>
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight mt-1">Admin Command Center</h1>
          <p class="text-sm text-slate-400">Global oversight of platform users, event inventory, and ecosystem revenues</p>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/admin/users"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all flex items-center gap-2"
          >
            <i class="pi pi-users text-xs"></i>
            <span>Manage Users</span>
          </a>
          <a
            routerLink="/organizer/events/new"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-2"
          >
            <i class="pi pi-plus text-xs"></i>
            <span>Create Event</span>
          </a>
        </div>
      </div>

      @if (isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div class="h-4 w-1/2 bg-slate-800 rounded"></div>
              <div class="h-8 w-3/4 bg-slate-800 rounded"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="glass-panel p-10 rounded-2xl border border-rose-800/50 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Failed to load admin metrics</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadAdminData()"
            class="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow"
          >
            Retry
          </button>
        </div>
      } @else {
        <!-- Global Metrics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Users -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Total Registered Users</span>
              <div class="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center text-sm">
                <i class="pi pi-users"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-black text-white">{{ userSummary()?.total || 0 }}</span>
              <span class="text-xs text-slate-500 font-medium">accounts</span>
            </div>
            <div class="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
              <span>{{ userSummary()?.organizers }} Organizers</span>
              <span>&bull;</span>
              <span>{{ userSummary()?.admins }} Admins</span>
            </div>
          </div>

          <!-- Total Platform Events -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Platform Events</span>
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-sm">
                <i class="pi pi-calendar"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-black text-white">{{ globalStats()?.totalEvents || 0 }}</span>
              <span class="text-xs text-slate-500 font-medium">({{ globalStats()?.publishedEvents || 0 }} live)</span>
            </div>
            <div class="mt-2 text-[11px] text-slate-400">
              Avg Occupancy: <strong class="text-white">{{ ((globalStats()?.averageOccupancy || 0) * 100).toFixed(1) }}%</strong>
            </div>
          </div>

          <!-- Total Bookings -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Total Bookings</span>
              <div class="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-sm">
                <i class="pi pi-ticket"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-black text-white">{{ globalStats()?.totalBookings || 0 }}</span>
              <span class="text-xs text-slate-500 font-medium block">reservations confirmed</span>
            </div>
            <div class="mt-2 text-[11px] text-slate-400">
              Across all event categories
            </div>
          </div>

          <!-- Platform Gross Revenue -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-400">Total Revenue Volume</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-sm">
                <i class="pi pi-dollar"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="text-2xl font-black text-emerald-400">
                {{ (globalStats()?.totalRevenueCents || 0) | centsToDollars }}
              </span>
            </div>
            <div class="mt-2 text-[11px] text-slate-400">
              Processed booking value
            </div>
          </div>
        </div>

        <!-- Quick Access Portals Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Users Control Portal -->
          <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <i class="pi pi-users text-lg"></i>
                </div>
                <div>
                  <h2 class="text-base font-bold text-white">Users & Roles Oversight</h2>
                  <p class="text-xs text-slate-400">Manage user roles, elevate organizers, and view accounts</p>
                </div>
              </div>
              <a
                routerLink="/admin/users"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-all"
              >
                Open Roster
              </a>
            </div>

            <!-- Recent Users mini list -->
            <div class="pt-2 divide-y divide-slate-800/80">
              @for (u of recentUsers(); track u.id) {
                <div class="py-2.5 flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-full bg-slate-800 text-[10px] text-white font-bold flex items-center justify-center">
                      {{ u.fullName.charAt(0) }}
                    </div>
                    <div>
                      <span class="text-xs font-semibold text-white block">{{ u.fullName }}</span>
                      <span class="text-[10px] text-slate-500 font-mono">{{ u.email }}</span>
                    </div>
                  </div>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    [ngClass]="{
                      'bg-purple-950 text-purple-300 border border-purple-800': u.role === 'admin',
                      'bg-indigo-950 text-indigo-300 border border-indigo-800': u.role === 'organizer',
                      'bg-emerald-950 text-emerald-300 border border-emerald-800': u.role === 'attendee'
                    }"
                  >
                    {{ u.role }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Organizer Management Portal -->
          <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <i class="pi pi-chart-bar text-lg"></i>
                </div>
                <div>
                  <h2 class="text-base font-bold text-white">Events & GraphQL Analytics</h2>
                  <p class="text-xs text-slate-400">View live occupancy rates, CSV exports, and event rosters</p>
                </div>
              </div>
              <a
                routerLink="/organizer"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
              >
                Organizer Hub
              </a>
            </div>

            <div class="pt-4 space-y-3">
              <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span class="text-xs text-slate-300">Host New Event as Admin</span>
                <a routerLink="/organizer/events/new" class="text-xs text-indigo-400 font-semibold hover:underline">
                  + Create Event
                </a>
              </div>
              <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <span class="text-xs text-slate-300">Public Discovery Portal</span>
                <a routerLink="/events" class="text-xs text-indigo-400 font-semibold hover:underline">
                  Browse Events
                </a>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly graphqlApi = inject(AnalyticsGraphqlService);
  private readonly errorHandler = inject(ErrorHandlerService);

  userSummary = signal<UserSummary | null>(null);
  globalStats = signal<OrganizerStatsGQL | null>(null);
  recentUsers = signal<User[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadAdminData();
  }

  loadAdminData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Fetch users summary and recent users
    this.usersApi.listUsers({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }).subscribe({
      next: (usersRes) => {
        this.userSummary.set(usersRes.summary);
        this.recentUsers.set(usersRes.data);

        // Fetch GraphQL stats (admins see system-wide stats)
        this.graphqlApi.getOrganizerDashboardData(5).subscribe({
          next: (gqlRes) => {
            this.globalStats.set(gqlRes.organizerStats);
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.error.set(this.errorHandler.getUserFacingMessage(err));
          },
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }
}
