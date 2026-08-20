import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { EventsApiService } from '../../../core/http/events-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { Event, ListEventsParams } from '../../../core/models/event.model';
import { Pagination } from '../../../core/models/api.model';
import { CentsToDollarsPipe } from '../../../shared/pipes/cents-to-dollars.pipe';
import { OccupancyBarComponent } from '../../../shared/components/occupancy-bar/occupancy-bar.component';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CentsToDollarsPipe,
    OccupancyBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-8 pb-16">
      <!-- Hero Banner -->
      <section class="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950/70 via-slate-900/60 to-slate-950 border border-slate-800/80 p-8 sm:p-12 shadow-2xl">
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 max-w-3xl space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <i class="pi pi-bolt text-[10px]"></i>
            <span>Live Events & Conferences</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Discover and reserve seats at the tech events you love.
          </h1>
          <p class="text-base sm:text-lg text-slate-300">
            Real-time seat availability, verified tickets, and instant booking confirmed directly by organizers.
          </p>
        </div>
      </section>

      <!-- Forbidden alert if redirected from organizer guard -->
      @if (forbiddenAlert()) {
        <aside
          aria-label="Permission alert"
          class="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/30 text-amber-200 text-sm flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3">
            <i class="pi pi-shield text-amber-400 text-lg"></i>
            <span>Access denied: The requested page requires an <strong>organizer</strong> or <strong>admin</strong> account.</span>
          </div>
          <button (click)="forbiddenAlert.set(false)" class="text-amber-400 hover:text-white text-xs">
            <i class="pi pi-times"></i>
          </button>
        </aside>
      }

      <!-- Search & Filters Toolbar -->
      <section aria-label="Event search and filters" class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <!-- Search Input (debounced 300ms) -->
          <div class="md:col-span-4 relative">
            <i class="pi pi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input
              type="text"
              [formControl]="searchControl"
              placeholder="Search title, venue, topic..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Venue Filter -->
          <div class="md:col-span-3 relative">
            <i class="pi pi-map-marker absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input
              type="text"
              [formControl]="venueControl"
              placeholder="Filter by venue..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <!-- Sort Select -->
          <div class="md:col-span-3">
            <select
              [formControl]="sortControl"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="startsAt:asc">Date: Upcoming First</option>
              <option value="startsAt:desc">Date: Furthest First</option>
              <option value="priceCents:asc">Price: Low to High</option>
              <option value="priceCents:desc">Price: High to Low</option>
              <option value="capacity:desc">Capacity: Largest First</option>
              <option value="title:asc">Title: A to Z</option>
            </select>
          </div>

          <!-- Reset Button -->
          <div class="md:col-span-2 flex items-center">
            <button
              type="button"
              (click)="resetFilters()"
              class="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <i class="pi pi-refresh text-[10px]"></i>
              <span>Clear Filters</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Events Content Area -->
      @if (isLoading()) {
        <!-- Skeleton Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4 animate-pulse">
              <div class="flex justify-between items-start">
                <div class="h-6 w-3/4 bg-slate-800 rounded-md"></div>
                <div class="h-5 w-16 bg-slate-800 rounded-full"></div>
              </div>
              <div class="h-4 w-1/2 bg-slate-800 rounded-md"></div>
              <div class="h-12 w-full bg-slate-800/60 rounded-md"></div>
              <div class="pt-4 border-t border-slate-800/60 flex justify-between items-center">
                <div class="h-6 w-20 bg-slate-800 rounded-md"></div>
                <div class="h-9 w-24 bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="glass-panel p-10 rounded-2xl border border-rose-800/50 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Failed to load events</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadEvents()"
            class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
          >
            Try Again
          </button>
        </div>
      } @else if (events().length === 0) {
        <!-- Empty State -->
        <div class="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            <i class="pi pi-calendar-times"></i>
          </div>
          <h2 class="text-lg font-bold text-white">No events found</h2>
          <p class="text-sm text-slate-400">
            No events match your current search or filter criteria. Try clearing filters to see all available events.
          </p>
          <button
            type="button"
            (click)="resetFilters()"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      } @else {
        <!-- Event Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (event of events(); track event.id) {
            <article
              class="glass-card rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              [ngClass]="{
                'opacity-80 border-slate-800 bg-slate-950/40': event.seatsAvailable <= 0 || event.status === 'cancelled',
                'border-slate-800/90 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5': event.seatsAvailable > 0 && event.status === 'published'
              }"
            >
              <div class="space-y-4">
                <!-- Status & Date Header -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
                    <i class="pi pi-calendar text-[11px]"></i>
                    <span>{{ event.startsAt | date: 'mediumDate' }} &bull; {{ event.startsAt | date: 'shortTime' }}</span>
                  </div>

                  @if (event.status === 'cancelled') {
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      Cancelled
                    </span>
                  } @else if (event.seatsAvailable <= 0) {
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      Sold Out
                    </span>
                  } @else if (event.status === 'draft') {
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      Draft
                    </span>
                  } @else {
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {{ event.seatsAvailable }} left
                    </span>
                  }
                </div>

                <!-- Event Title & Venue -->
                <div class="space-y-1.5">
                  <h3 class="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    <a [routerLink]="['/events', event.id]" class="hover:underline">
                      {{ event.title }}
                    </a>
                  </h3>
                  <p class="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1">
                    <i class="pi pi-map-marker text-slate-500 text-[10px]"></i>
                    <span>{{ event.venue }}</span>
                  </p>
                </div>

                <!-- Description -->
                @if (event.description) {
                  <p class="text-xs text-slate-400/90 line-clamp-2 leading-relaxed">
                    {{ event.description }}
                  </p>
                }

                <!-- Capacity Progress Bar -->
                <div class="pt-2">
                  <app-occupancy-bar
                    [capacity]="event.capacity"
                    [seatsTaken]="event.seatsTaken"
                    [showLabels]="true"
                  />
                </div>
              </div>

              <!-- Footer: Price & Details Action -->
              <div class="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block">Price</span>
                  <span class="text-lg font-extrabold text-white">
                    {{ event.priceCents | centsToDollars }}
                  </span>
                </div>

                <a
                  [routerLink]="['/events', event.id]"
                  class="px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  [ngClass]="{
                    'bg-slate-800 hover:bg-slate-700 text-slate-200': event.seatsAvailable <= 0,
                    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95': event.seatsAvailable > 0
                  }"
                >
                  <span>{{ event.seatsAvailable <= 0 ? 'View Details' : 'Book Tickets' }}</span>
                  <i class="pi pi-chevron-right text-[10px]"></i>
                </a>
              </div>
            </article>
          }
        </div>

        <!-- Pagination Controls -->
        @if (pagination(); as pag) {
          @if (pag.totalPages > 1) {
            <nav aria-label="Events pagination" class="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div class="text-xs text-slate-400">
                Showing <span class="font-bold text-white">{{ (pag.page - 1) * pag.limit + 1 }}</span>
                to <span class="font-bold text-white">{{ min((pag.page * pag.limit), pag.total) }}</span>
                of <span class="font-bold text-white">{{ pag.total }}</span> events
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  [disabled]="pag.page <= 1"
                  (click)="goToPage(pag.page - 1)"
                  aria-label="Previous page"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 transition-colors"
                >
                  <i class="pi pi-chevron-left text-[10px] mr-1"></i>
                  Prev
                </button>

                <span class="text-xs font-semibold px-2 text-slate-300">
                  Page {{ pag.page }} of {{ pag.totalPages }}
                </span>

                <button
                  type="button"
                  [disabled]="pag.page >= pag.totalPages"
                  (click)="goToPage(pag.page + 1)"
                  aria-label="Next page"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 transition-colors"
                >
                  Next
                  <i class="pi pi-chevron-right text-[10px] ml-1"></i>
                </button>
              </div>
            </nav>
          }
        }
      }
    </div>
  `,
})
export class EventListComponent implements OnInit {
  private readonly eventsApi = inject(EventsApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly route = inject(ActivatedRoute);

  events = signal<Event[]>([]);
  pagination = signal<Pagination | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  forbiddenAlert = signal(false);

  searchControl = new FormControl('', { nonNullable: true });
  venueControl = new FormControl('', { nonNullable: true });
  sortControl = new FormControl('startsAt:asc', { nonNullable: true });

  currentPage = signal(1);
  pageSize = signal(9);

  min = Math.min;

  ngOnInit(): void {
    if (this.route.snapshot.queryParams['forbidden']) {
      this.forbiddenAlert.set(true);
    }

    // Debounced search handling
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadEvents();
      });

    this.venueControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadEvents();
      });

    this.sortControl.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadEvents();
    });

    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const [sortBy, sortOrder] = this.sortControl.value.split(':') as [
      'startsAt' | 'createdAt' | 'priceCents' | 'capacity' | 'title',
      'asc' | 'desc'
    ];

    const params: ListEventsParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchControl.value.trim() || undefined,
      venue: this.venueControl.value.trim() || undefined,
      sortBy: sortBy || 'startsAt',
      sortOrder: sortOrder || 'asc',
    };

    this.eventsApi.listEvents(params).subscribe({
      next: (response) => {
        this.events.set(response.data);
        this.pagination.set(response.pagination);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadEvents();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.venueControl.setValue('', { emitEvent: false });
    this.sortControl.setValue('startsAt:asc', { emitEvent: false });
    this.currentPage.set(1);
    this.loadEvents();
  }
}
