import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsGraphqlService } from '../../../core/http/analytics-graphql.service';
import { EventsApiService } from '../../../core/http/events-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { EventStatsGQL } from '../../../core/models/analytics.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';

@Component({
  selector: 'app-event-attendees',
  standalone: true,
  imports: [CommonModule, RouterLink, CentsToDollarsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto space-y-8 pb-16">
      <!-- Back Navigation -->
      <div>
        <a
          routerLink="/organizer"
          class="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <i class="pi pi-arrow-left text-[10px]"></i>
          <span>Back to Organizer Dashboard</span>
        </a>
      </div>

      @if (isLoading()) {
        <div class="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <i class="pi pi-spin pi-spinner text-3xl text-indigo-400"></i>
          <p class="text-xs text-slate-400">Loading attendee roster...</p>
        </div>
      } @else if (error()) {
        <div class="glass-panel p-10 rounded-2xl border border-rose-800/50 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Failed to load attendees</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadAttendees()"
            class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow"
          >
            Retry
          </button>
        </div>
      } @else if (eventStats(); as ev) {
        <!-- Event Header & CSV Export Action -->
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-slate-500">Event #{{ ev.id }}</span>
              <span class="text-xs font-semibold text-indigo-400">&bull; {{ ev.venue }}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {{ ev.title }}
            </h1>
            <div class="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span><strong>{{ ev.seatsTaken }}</strong> of <strong>{{ ev.capacity }}</strong> seats booked</span>
              <span>&bull;</span>
              <span><strong>{{ (ev.occupancyRate * 100).toFixed(1) }}%</strong> occupancy</span>
              <span>&bull;</span>
              <span class="text-emerald-400 font-semibold">{{ ev.revenueCents | centsToDollars }} revenue</span>
            </div>
          </div>

          <!-- CSV Export Button -->
          <div class="shrink-0">
            <button
              type="button"
              [disabled]="isExporting() || (ev.attendees?.length ?? 0) === 0"
              (click)="onExportCsv()"
              class="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
            >
              @if (isExporting()) {
                <i class="pi pi-spin pi-spinner text-xs"></i>
                <span>Streaming CSV...</span>
              } @else {
                <i class="pi pi-download text-xs"></i>
                <span>Export Attendees CSV</span>
              }
            </button>
          </div>
        </div>

        <!-- Export Toast / Error -->
        @if (exportSuccess()) {
          <aside
            role="status"
            aria-live="polite"
            class="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-check-circle text-emerald-400 text-sm"></i>
              <span>Attendee list downloaded successfully.</span>
            </div>
            <button (click)="exportSuccess.set(false)" class="text-emerald-400 hover:text-white text-xs">
              <i class="pi pi-times"></i>
            </button>
          </aside>
        }

        @if (exportError()) {
          <aside
            role="alert"
            class="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              <i class="pi pi-exclamation-triangle text-rose-400 text-sm"></i>
              <span>{{ exportError() }}</span>
            </div>
            <button (click)="exportError.set(null)" class="text-rose-400 hover:text-white text-xs">
              <i class="pi pi-times"></i>
            </button>
          </aside>
        }

        <!-- Attendees Table -->
        <section aria-label="Confirmed attendees" class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div class="p-5 border-b border-slate-800 flex items-center justify-between">
            <h2 class="text-base font-bold text-white">Confirmed Attendees</h2>
            <span class="text-xs text-slate-400">
              {{ ev.attendees?.length || 0 }} Registered
            </span>
          </div>

          @if (!ev.attendees || ev.attendees.length === 0) {
            <div class="p-12 text-center space-y-3">
              <div class="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
                <i class="pi pi-users"></i>
              </div>
              <h3 class="text-sm font-bold text-white">No attendees booked yet</h3>
              <p class="text-xs text-slate-400">When attendees book tickets for this event, their details will appear here.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900/90 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th scope="col" class="px-5 py-3.5">Booking ID</th>
                    <th scope="col" class="px-4 py-3.5">Attendee</th>
                    <th scope="col" class="px-4 py-3.5">Email</th>
                    <th scope="col" class="px-4 py-3.5">Seats</th>
                    <th scope="col" class="px-4 py-3.5">Total Paid</th>
                    <th scope="col" class="px-5 py-3.5">Booked At</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80">
                  @for (att of ev.attendees; track att.bookingId) {
                    <tr class="hover:bg-slate-800/40 transition-colors">
                      <td class="px-5 py-4 font-mono font-bold text-white">
                        #{{ att.bookingId }}
                      </td>
                      <td class="px-4 py-4 font-semibold text-white">
                        {{ att.fullName }}
                      </td>
                      <td class="px-4 py-4 text-slate-400 font-mono">
                        {{ att.email }}
                      </td>
                      <td class="px-4 py-4 font-bold text-slate-200">
                        {{ att.seats }}
                      </td>
                      <td class="px-4 py-4 font-semibold text-emerald-400">
                        {{ att.totalCents | centsToDollars }}
                      </td>
                      <td class="px-5 py-4 text-slate-400">
                        {{ att.bookedAt | date: 'medium' }}
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
export class EventAttendeesComponent implements OnInit {
  private readonly graphqlApi = inject(AnalyticsGraphqlService);
  private readonly eventsApi = inject(EventsApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly route = inject(ActivatedRoute);

  eventId = signal<number | null>(null);
  eventStats = signal<EventStatsGQL | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  isExporting = signal(false);
  exportSuccess = signal(false);
  exportError = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.eventId.set(id);
        this.loadAttendees();
      }
    }
  }

  loadAttendees(): void {
    const id = this.eventId();
    if (!id) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.graphqlApi.getEventStats(id).subscribe({
      next: (stats) => {
        this.eventStats.set(stats);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  onExportCsv(): void {
    const id = this.eventId();
    if (!id) return;

    this.isExporting.set(true);
    this.exportSuccess.set(false);
    this.exportError.set(null);

    this.eventsApi.downloadAttendeesCsv(id).subscribe({
      next: () => {
        this.isExporting.set(false);
        this.exportSuccess.set(true);
      },
      error: (err) => {
        this.isExporting.set(false);
        this.exportError.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }
}
