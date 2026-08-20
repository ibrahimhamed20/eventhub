import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsGraphqlService } from '../../../core/http/analytics-graphql.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import {
  OrganizerStatsGQL,
  EventStatsGQL,
} from '../../../core/models/analytics.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';
import { OccupancyBarComponent } from '../../../shared/components/occupancy-bar/occupancy-bar.component';

@Component({
  selector: 'app-organizer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CentsToDollarsPipe,
    OccupancyBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 pb-16">
      <!-- Header & Host Action -->
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
              GraphQL Powered Analytics
            </span>
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight mt-1">Organizer Dashboard</h1>
          <p class="text-sm text-slate-400">Real-time occupancy tracking, attendee breakdown, and revenue analytics</p>
        </div>

        <a
          routerLink="/organizer/events/new"
          class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-95"
        >
          <i class="pi pi-plus text-xs"></i>
          <span>Create New Event</span>
        </a>
      </div>

      @if (isLoading()) {
        <!-- Skeleton Stats -->
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
          <h2 class="text-lg font-bold text-white">Failed to load organizer metrics</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadDashboard()"
            class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow"
          >
            Retry
          </button>
        </div>
      } @else {
        @if (stats(); as st) {
          <!-- Stats Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Events -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400">Total Events</span>
                <div class="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-sm">
                  <i class="pi pi-calendar"></i>
                </div>
              </div>
              <div class="mt-3 flex items-baseline gap-2">
                <span class="text-2xl font-black text-white">{{ st.totalEvents }}</span>
                <span class="text-xs text-slate-500 font-medium">({{ st.publishedEvents }} published)</span>
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
                <span class="text-2xl font-black text-white">{{ st.totalBookings }}</span>
                <span class="text-xs text-slate-500 font-medium block">reservations confirmed</span>
              </div>
            </div>

            <!-- Gross Revenue -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400">Gross Revenue</span>
                <div class="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-sm">
                  <i class="pi pi-dollar"></i>
                </div>
              </div>
              <div class="mt-3">
                <span class="text-2xl font-black text-emerald-400">
                  {{ st.totalRevenueCents | centsToDollars }}
                </span>
                <span class="text-xs text-slate-500 font-medium block">across all events</span>
              </div>
            </div>

            <!-- Average Occupancy -->
            <div class="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-400">Avg Occupancy</span>
                <div class="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center text-sm">
                  <i class="pi pi-chart-pie"></i>
                </div>
              </div>
              <div class="mt-3">
                <span class="text-2xl font-black text-white">
                  {{ (st.averageOccupancy * 100).toFixed(1) }}%
                </span>
                <span class="text-xs text-slate-500 font-medium block">capacity filled</span>
              </div>
            </div>
          </div>
        }

        <!-- Events List Table -->
        <section aria-label="Organized events" class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div class="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 class="text-base font-bold text-white">Your Managed Events</h2>
            <span class="text-xs text-slate-400">{{ events().length }} Events Total</span>
          </div>

          @if (events().length === 0) {
            <div class="p-12 text-center space-y-3">
              <div class="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                <i class="pi pi-folder-open"></i>
              </div>
              <h3 class="text-sm font-bold text-white">No events created yet</h3>
              <p class="text-xs text-slate-400">Start by creating your first tech conference or workshop.</p>
              <a
                routerLink="/organizer/events/new"
                class="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Create Event
              </a>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900/90 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th scope="col" class="px-5 py-3.5">Event</th>
                    <th scope="col" class="px-4 py-3.5">Date & Venue</th>
                    <th scope="col" class="px-4 py-3.5">Status</th>
                    <th scope="col" class="px-4 py-3.5 w-44">Occupancy</th>
                    <th scope="col" class="px-4 py-3.5">Revenue</th>
                    <th scope="col" class="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80">
                  @for (ev of events(); track ev.id) {
                    <tr class="hover:bg-slate-800/40 transition-colors">
                      <!-- Event Title -->
                      <td class="px-5 py-4">
                        <div class="font-bold text-white text-sm hover:text-indigo-300 transition-colors">
                          <a [routerLink]="['/events', ev.id]">
                            {{ ev.title }}
                          </a>
                        </div>
                        <span class="text-[11px] text-slate-500 font-mono">ID #{{ ev.id }}</span>
                      </td>

                      <!-- Date & Venue -->
                      <td class="px-4 py-4 space-y-1">
                        <div class="font-medium text-slate-200">
                          {{ ev.startsAt | date: 'mediumDate' }}
                        </div>
                        <div class="text-[11px] text-slate-400 flex items-center gap-1">
                          <i class="pi pi-map-marker text-[10px] text-slate-500"></i>
                          <span>{{ ev.venue }}</span>
                        </div>
                      </td>

                      <!-- Status -->
                      <td class="px-4 py-4">
                        @if (ev.status === 'published') {
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Published
                          </span>
                        } @else if (ev.status === 'draft') {
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Draft
                          </span>
                        } @else {
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            Cancelled
                          </span>
                        }
                      </td>

                      <!-- Occupancy -->
                      <td class="px-4 py-4">
                        <app-occupancy-bar
                          [capacity]="ev.capacity"
                          [seatsTaken]="ev.seatsTaken"
                          [showLabels]="true"
                        />
                      </td>

                      <!-- Revenue -->
                      <td class="px-4 py-4">
                        <div class="font-bold text-emerald-400">
                          {{ ev.revenueCents | centsToDollars }}
                        </div>
                        <div class="text-[10px] text-slate-500">
                          {{ ev.bookingCount }} booking(s)
                        </div>
                      </td>

                      <!-- Actions -->
                      <td class="px-5 py-4 text-right">
                        <div class="inline-flex items-center gap-1.5">
                          <a
                            [routerLink]="['/organizer/events', ev.id, 'edit']"
                            class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="Edit Event"
                          >
                            <i class="pi pi-pencil text-xs"></i>
                          </a>
                          <a
                            [routerLink]="['/organizer/events', ev.id, 'attendees']"
                            class="p-2 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800 transition-colors"
                            title="View Attendees"
                          >
                            <i class="pi pi-users text-xs"></i>
                          </a>
                          <a
                            [routerLink]="['/events', ev.id]"
                            class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                            title="Public Page"
                          >
                            <i class="pi pi-external-link text-xs"></i>
                          </a>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class OrganizerDashboardComponent implements OnInit {
  private readonly graphqlApi = inject(AnalyticsGraphqlService);
  private readonly errorHandler = inject(ErrorHandlerService);

  stats = signal<OrganizerStatsGQL | null>(null);
  events = signal<EventStatsGQL[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.graphqlApi.getOrganizerDashboardData().subscribe({
      next: (data) => {
        this.stats.set(data.organizerStats);
        this.events.set(data.myEvents);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }
}
