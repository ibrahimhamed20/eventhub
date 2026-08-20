import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { EventsApiService } from '../../../core/http/events-api.service';
import { BookingsApiService } from '../../../core/http/bookings-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { Event } from '../../../core/models/event.model';
import { Booking } from '../../../core/models/booking.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';
import { OccupancyBarComponent } from '../../../shared/components/occupancy-bar/occupancy-bar.component';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CentsToDollarsPipe,
    OccupancyBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-5xl mx-auto space-y-8 pb-16">
      <!-- Back Navigation -->
      <div>
        <a
          routerLink="/events"
          class="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <i class="pi pi-arrow-left text-[10px]"></i>
          <span>Back to All Events</span>
        </a>
      </div>

      @if (isLoading()) {
        <!-- Loading Skeleton -->
        <div class="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6 animate-pulse">
          <div class="h-8 w-2/3 bg-slate-800 rounded-lg"></div>
          <div class="h-4 w-1/3 bg-slate-800 rounded-md"></div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div class="md:col-span-2 space-y-4">
              <div class="h-24 bg-slate-800/60 rounded-xl"></div>
              <div class="h-32 bg-slate-800/60 rounded-xl"></div>
            </div>
            <div class="h-64 bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      } @else if (error() || !event()) {
        <!-- Error State -->
        <div class="glass-panel p-12 rounded-3xl border border-rose-800/50 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-2xl">
            <i class="pi pi-calendar-times"></i>
          </div>
          <h2 class="text-xl font-bold text-white">Event Not Found</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">
            {{ error() || 'The requested event is either unpublished, non-existent, or you do not have permission to view it.' }}
          </p>
          <a
            routerLink="/events"
            class="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
          >
            Explore Available Events
          </a>
        </div>
      } @else {
        @let ev = event()!;

        <!-- Main Detail Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Column: Details -->
          <div class="lg:col-span-8 space-y-6">
            <!-- Event Hero Card -->
            <section class="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
              <!-- Status & Owner Affordances -->
              <div class="flex items-center justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-2">
                  @if (ev.status === 'cancelled') {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                      Cancelled
                    </span>
                  } @else if (ev.status === 'draft') {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                      Draft (Owner View)
                    </span>
                  } @else {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      Published
                    </span>
                  }

                  @if (ev.seatsAvailable <= 0) {
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      Sold Out
                    </span>
                  }
                </div>

                <!-- Organizer Actions if current user is owner -->
                @if (isOwner()) {
                  <div class="flex items-center gap-2">
                    <a
                      [routerLink]="['/organizer/events', ev.id, 'edit']"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <i class="pi pi-pencil text-[10px]"></i>
                      <span>Edit Event</span>
                    </a>
                    <a
                      [routerLink]="['/organizer/events', ev.id, 'attendees']"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800 transition-colors flex items-center gap-1.5"
                    >
                      <i class="pi pi-users text-[10px]"></i>
                      <span>Attendees</span>
                    </a>
                  </div>
                }
              </div>

              <!-- Title -->
              <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {{ ev.title }}
              </h1>

              <!-- Key Metadata Badges -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div class="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <i class="pi pi-calendar text-lg"></i>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Date & Time</span>
                    <span class="text-sm font-semibold text-white">
                      {{ ev.startsAt | date: 'fullDate' }}
                    </span>
                    <span class="text-xs text-slate-400 block">
                      {{ ev.startsAt | date: 'shortTime' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                  <div class="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <i class="pi pi-map-marker text-lg"></i>
                  </div>
                  <div>
                    <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Location</span>
                    <span class="text-sm font-semibold text-white">
                      {{ ev.venue }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Description -->
              <div class="space-y-2 pt-4 border-t border-slate-800">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">About This Event</h2>
                <div class="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {{ ev.description || 'No detailed description provided for this event.' }}
                </div>
              </div>

              <!-- Live Capacity Meter -->
              <div class="space-y-2 pt-4 border-t border-slate-800">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Seat Availability</h2>
                <app-occupancy-bar
                  [capacity]="ev.capacity"
                  [seatsTaken]="ev.seatsTaken"
                  [showLabels]="true"
                />
                <div class="flex justify-between text-xs text-slate-400 pt-1">
                  <span>Capacity: <strong class="text-white">{{ ev.capacity }}</strong> total seats</span>
                  <span>
                    Remaining:
                    <strong [ngClass]="ev.seatsAvailable > 0 ? 'text-emerald-400' : 'text-rose-400'">
                      {{ ev.seatsAvailable }}
                    </strong>
                  </span>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Column: Booking Panel -->
          <div class="lg:col-span-4 sticky top-24 space-y-4">
            <section class="glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              <!-- Price Header -->
              <div class="flex items-baseline justify-between border-b border-slate-800 pb-4">
                <span class="text-xs font-semibold text-slate-400">Ticket Price</span>
                <div class="text-right">
                  <span class="text-2xl font-black text-white">
                    {{ ev.priceCents | centsToDollars }}
                  </span>
                  <span class="text-[11px] text-slate-500 block">per attendee</span>
                </div>
              </div>

              <!-- Booking Form / Actions -->
              @if (bookingSuccess()) {
                <!-- Booking Confirmed State -->
                <div class="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-600/50 text-center space-y-3">
                  <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-lg">
                    <i class="pi pi-check"></i>
                  </div>
                  <h3 class="text-sm font-bold text-white">Booking Confirmed!</h3>
                  <p class="text-xs text-emerald-200">
                    Your tickets for {{ bookedSeats() }} seat(s) are reserved.
                  </p>
                  <a
                    routerLink="/bookings"
                    class="inline-block w-full py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
                  >
                    View in My Bookings
                  </a>
                </div>
              } @else if (ev.status === 'cancelled') {
                <div class="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-center text-xs text-rose-300">
                  This event has been cancelled by the organizer. Bookings are closed.
                </div>
              } @else if (ev.seatsAvailable <= 0) {
                <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <span class="text-sm font-bold text-rose-400 block">Sold Out</span>
                  <p class="text-xs text-slate-400">
                    All {{ ev.capacity }} seats have been reserved. Please check back later in case of cancellations.
                  </p>
                </div>
              } @else if (isEventPast()) {
                <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <span class="text-sm font-bold text-amber-400 block">Event Ended</span>
                  <p class="text-xs text-slate-400">This event has already taken place.</p>
                </div>
              } @else {
                <!-- Active Booking Widget -->
                @if (bookingError()) {
                  <div
                    role="alert"
                    class="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5"
                  >
                    <i class="pi pi-exclamation-circle text-rose-400 mt-0.5"></i>
                    <div class="flex-1">
                      <p class="font-medium">{{ bookingError() }}</p>
                    </div>
                  </div>
                }

                @if (!authStore.isAuthenticated()) {
                  <!-- Guest Sign In Prompt -->
                  <div class="space-y-4">
                    <p class="text-xs text-slate-400 leading-relaxed">
                      You must be signed in to reserve tickets for this event.
                    </p>
                    <a
                      [routerLink]="['/login']"
                      [queryParams]="{ returnUrl: '/events/' + ev.id }"
                      class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-center block text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/25"
                    >
                      Sign In to Book
                    </a>
                    <a
                      [routerLink]="['/register']"
                      class="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-center block text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      Create Free Account
                    </a>
                  </div>
                } @else {
                  <!-- Authenticated Attendee Booking Form -->
                  <div class="space-y-4">
                    <!-- Seats Selector -->
                    <div class="space-y-1.5">
                      <label for="seats" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Select Quantity
                      </label>
                      <div class="flex items-center gap-3">
                        <button
                          type="button"
                          [disabled]="selectedSeats() <= 1"
                          (click)="selectedSeats.set(selectedSeats() - 1)"
                          aria-label="Decrease seat quantity"
                          class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-base flex items-center justify-center transition-colors"
                        >
                          <i class="pi pi-minus text-xs"></i>
                        </button>

                        <div class="flex-1 text-center font-bold text-lg text-white bg-slate-900/80 py-2 rounded-xl border border-slate-800">
                          {{ selectedSeats() }}
                        </div>

                        <button
                          type="button"
                          [disabled]="selectedSeats() >= maxSelectableSeats()"
                          (click)="selectedSeats.set(selectedSeats() + 1)"
                          aria-label="Increase seat quantity"
                          class="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-base flex items-center justify-center transition-colors"
                        >
                          <i class="pi pi-plus text-xs"></i>
                        </button>
                      </div>
                      <span class="text-[11px] text-slate-500 block text-center">
                        Max {{ maxSelectableSeats() }} tickets per transaction
                      </span>
                    </div>

                    <!-- Computed Total Summary -->
                    <div class="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <div class="flex justify-between text-xs text-slate-400">
                        <span>{{ selectedSeats() }} &times; {{ ev.priceCents | centsToDollars }}</span>
                        <span>{{ computedTotalCents() | centsToDollars }}</span>
                      </div>
                      <div class="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                        <span>Total Due</span>
                        <span class="text-indigo-400">{{ computedTotalCents() | centsToDollars }}</span>
                      </div>
                    </div>

                    <!-- Book Action Button -->
                    <button
                      type="button"
                      [disabled]="isBooking() || (authStore.rateLimitCooldownSec() ?? 0) > 0"
                      (click)="onBookTickets()"
                      class="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                    >
                      @if (isBooking()) {
                        <i class="pi pi-spin pi-spinner text-sm"></i>
                        <span>Confirming reservation...</span>
                      } @else {
                        <span>Confirm & Book ({{ selectedSeats() }} Seats)</span>
                        <i class="pi pi-check text-xs"></i>
                      }
                    </button>
                  </div>
                }
              }
            </section>
          </div>
        </div>
      }
    </div>
  `,
})
export class EventDetailComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly eventsApi = inject(EventsApiService);
  private readonly bookingsApi = inject(BookingsApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  eventId = signal<number | null>(null);
  event = signal<Event | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  selectedSeats = signal(1);
  isBooking = signal(false);
  bookingError = signal<string | null>(null);
  bookingSuccess = signal(false);
  bookedSeats = signal(0);

  isOwner = computed(() => {
    const ev = this.event();
    const currentUserId = this.authStore.currentUserId();
    const isAdmin = this.authStore.isAdmin();
    if (!ev || !currentUserId) return false;
    return ev.organizerId === currentUserId || isAdmin;
  });

  isEventPast = computed(() => {
    const ev = this.event();
    if (!ev) return false;
    return new Date(ev.startsAt) <= new Date();
  });

  maxSelectableSeats = computed(() => {
    const ev = this.event();
    if (!ev) return 1;
    return Math.min(10, Math.max(1, ev.seatsAvailable));
  });

  computedTotalCents = computed(() => {
    const ev = this.event();
    if (!ev) return 0;
    return this.selectedSeats() * ev.priceCents;
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.eventId.set(id);
        this.loadEvent(id);
      } else {
        this.error.set('Invalid event ID');
        this.isLoading.set(false);
      }
    }
  }

  loadEvent(id: number, silent = false): void {
    if (!silent) {
      this.isLoading.set(true);
      this.error.set(null);
    }

    this.eventsApi.getEventById(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.isLoading.set(false);

        // Adjust selected seats if availability changed
        if (this.selectedSeats() > event.seatsAvailable) {
          this.selectedSeats.set(Math.max(1, event.seatsAvailable));
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  onBookTickets(): void {
    const ev = this.event();
    if (!ev) return;

    this.isBooking.set(true);
    this.bookingError.set(null);

    const seatsToBook = this.selectedSeats();

    this.bookingsApi
      .createBooking({
        eventId: ev.id,
        seats: seatsToBook,
      })
      .subscribe({
        next: (booking: Booking) => {
          this.isBooking.set(false);
          this.bookingSuccess.set(true);
          this.bookedSeats.set(seatsToBook);
          // Refetch event in background to refresh live numbers
          this.loadEvent(ev.id, true);
        },
        error: (err) => {
          this.isBooking.set(false);
          const parsed = this.errorHandler.parseApiError(err);

          if (parsed.code === 'SOLD_OUT') {
            this.bookingError.set(
              'Sorry, not enough seats are available. We have refreshed the availability below.'
            );
            // Critical behavior requirement: refetch event when SOLD_OUT occurs
            this.loadEvent(ev.id, true);
          } else {
            this.bookingError.set(this.errorHandler.getUserFacingMessage(err));
          }
        },
      });
  }
}
