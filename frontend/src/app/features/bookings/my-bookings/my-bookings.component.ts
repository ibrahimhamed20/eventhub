import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsApiService } from '../../../core/http/bookings-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { Booking } from '../../../core/models/booking.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, CentsToDollarsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-5xl mx-auto space-y-8 pb-16">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">My Bookings</h1>
          <p class="text-sm text-slate-400 mt-1">Manage your event reservations, tickets, and attendance</p>
        </div>
        <a
          routerLink="/events"
          class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <i class="pi pi-search text-xs"></i>
          <span>Explore More Events</span>
        </a>
      </div>

      <!-- Action Toast / Alert -->
      @if (actionMessage()) {
        <aside
          role="status"
          aria-live="polite"
          class="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-check-circle text-emerald-400 text-sm"></i>
            <span>{{ actionMessage() }}</span>
          </div>
          <button (click)="actionMessage.set(null)" class="text-emerald-400 hover:text-white text-xs">
            <i class="pi pi-times"></i>
          </button>
        </aside>
      }

      @if (actionError()) {
        <aside
          role="alert"
          class="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-rose-400 text-sm"></i>
            <span>{{ actionError() }}</span>
          </div>
          <button (click)="actionError.set(null)" class="text-rose-400 hover:text-white text-xs">
            <i class="pi pi-times"></i>
          </button>
        </aside>
      }

      @if (isLoading()) {
        <!-- Skeleton List -->
        <div class="space-y-4">
          @for (item of [1, 2, 3]; track item) {
            <div class="glass-card p-6 rounded-2xl border border-slate-800 animate-pulse space-y-3">
              <div class="h-6 w-1/3 bg-slate-800 rounded"></div>
              <div class="h-4 w-1/4 bg-slate-800 rounded"></div>
              <div class="h-4 w-1/2 bg-slate-800 rounded"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="glass-panel p-10 rounded-2xl border border-rose-800/50 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Could not load bookings</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadBookings()"
            class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow"
          >
            Retry
          </button>
        </div>
      } @else if (bookings().length === 0) {
        <!-- Empty State -->
        <div class="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            <i class="pi pi-ticket"></i>
          </div>
          <h2 class="text-lg font-bold text-white">No Bookings Yet</h2>
          <p class="text-sm text-slate-400">
            You haven't reserved any tickets yet. Explore upcoming conferences and events to book your seats.
          </p>
          <a
            routerLink="/events"
            class="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            Discover Events
          </a>
        </div>
      } @else {
        <!-- Bookings List -->
        <div class="space-y-4">
          @for (b of bookings(); track b.id) {
            <div
              class="glass-panel p-6 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              [ngClass]="{
                'border-slate-800/80 hover:border-slate-700 bg-slate-900/60': b.status === 'confirmed',
                'border-slate-900 bg-slate-950/40 opacity-70': b.status === 'cancelled'
              }"
            >
              <!-- Left: Event and Reservation Details -->
              <div class="space-y-3 flex-1">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span class="text-xs font-mono text-slate-500">
                    Booking #{{ b.id }}
                  </span>

                  @if (b.status === 'confirmed') {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Confirmed
                    </span>
                  } @else {
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      Cancelled
                    </span>
                  }

                  <span class="text-xs text-slate-500">
                    Booked on {{ b.createdAt | date: 'mediumDate' }}
                  </span>
                </div>

                <div>
                  <h2 class="text-lg font-bold text-white hover:text-indigo-300 transition-colors">
                    @if (b.event) {
                      <a [routerLink]="['/events', b.event.id]">
                        {{ b.event.title }}
                      </a>
                    } @else {
                      <span>Event #{{ b.eventId }}</span>
                    }
                  </h2>

                  @if (b.event) {
                    <div class="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                      <span class="flex items-center gap-1">
                        <i class="pi pi-calendar text-indigo-400 text-[10px]"></i>
                        {{ b.event.startsAt | date: 'mediumDate' }} at {{ b.event.startsAt | date: 'shortTime' }}
                      </span>
                      <span class="flex items-center gap-1">
                        <i class="pi pi-map-marker text-cyan-400 text-[10px]"></i>
                        {{ b.event.venue }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Right: Seats, Amount & Cancel Action -->
              <div class="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                <div class="text-left md:text-right">
                  <div class="text-sm font-bold text-white">
                    {{ b.seats }} {{ b.seats === 1 ? 'Seat' : 'Seats' }}
                  </div>
                  <div class="text-xs text-indigo-400 font-semibold">
                    {{ b.totalCents | centsToDollars }} Paid
                  </div>
                </div>

                @if (b.status === 'confirmed') {
                  @if (hasEventStarted(b.event?.startsAt)) {
                    <div class="relative group">
                      <button
                        type="button"
                        disabled
                        class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
                      >
                        Cancellation Closed
                      </button>
                      <div class="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300 text-center shadow-lg">
                        Cannot cancel an event that has already started.
                      </div>
                    </div>
                  } @else {
                    <button
                      type="button"
                      [disabled]="cancellingId() === b.id"
                      (click)="confirmCancellation(b)"
                      class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      @if (cancellingId() === b.id) {
                        <i class="pi pi-spin pi-spinner text-xs"></i>
                        <span>Cancelling...</span>
                      } @else {
                        <i class="pi pi-times text-xs"></i>
                        <span>Cancel Booking</span>
                      }
                    </button>
                  }
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Custom Modal Confirmation Dialog -->
      @if (pendingCancelBooking()) {
        @let pending = pendingCancelBooking()!;
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div class="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
            <div class="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-400 flex items-center justify-center text-xl">
              <i class="pi pi-exclamation-triangle"></i>
            </div>

            <div class="space-y-2">
              <h2 id="cancel-dialog-title" class="text-lg font-bold text-white">Cancel this booking?</h2>
              <p class="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to cancel your reservation for
                <strong class="text-white">{{ pending.seats }} seat(s)</strong>
                at <strong class="text-white">{{ pending.event?.title || 'this event' }}</strong>?
                The reserved seats will immediately be returned to the ticket pool.
              </p>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="pendingCancelBooking.set(null)"
                class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                (click)="executeCancellation(pending.id)"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
              >
                Yes, Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MyBookingsComponent implements OnInit {
  private readonly bookingsApi = inject(BookingsApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  bookings = signal<Booking[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  cancellingId = signal<number | null>(null);
  actionMessage = signal<string | null>(null);
  actionError = signal<string | null>(null);
  pendingCancelBooking = signal<Booking | null>(null);

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.bookingsApi.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  hasEventStarted(startsAt?: string): boolean {
    if (!startsAt) return false;
    return new Date(startsAt) <= new Date();
  }

  confirmCancellation(booking: Booking): void {
    this.pendingCancelBooking.set(booking);
  }

  executeCancellation(bookingId: number): void {
    this.pendingCancelBooking.set(null);
    this.cancellingId.set(bookingId);
    this.actionMessage.set(null);
    this.actionError.set(null);

    this.bookingsApi.cancelBooking(bookingId).subscribe({
      next: (updatedBooking) => {
        this.cancellingId.set(null);
        this.actionMessage.set('Booking cancelled successfully. Seats have been returned to the pool.');

        // Optimistic UI state update
        this.bookings.update((list) =>
          list.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        );
      },
      error: (err) => {
        this.cancellingId.set(null);
        this.actionError.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }
}
