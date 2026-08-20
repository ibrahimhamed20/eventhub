import {
  Component,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-7xl mx-auto space-y-8 pb-20">
      <!-- Top Hero Header -->
      <div class="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-800 relative overflow-hidden shadow-2xl">
        <div class="absolute -right-10 -top-10 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-3xl space-y-4 relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
            <i class="pi pi-book text-xs"></i>
            <span>EventHub Documentation & User Guide</span>
          </div>

          <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Platform Guide & Architecture
          </h1>

          <p class="text-slate-400 text-sm sm:text-base leading-relaxed">
            Comprehensive manual covering roles, concurrency controls, ticket reservation workflows, organizer analytics, and administration.
          </p>

          <div class="pt-2 flex flex-wrap items-center gap-3">
            <a
              routerLink="/events"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20"
            >
              Explore Public Events
            </a>
            <a
              routerLink="/login"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Sign In to Platform
            </a>
          </div>
        </div>
      </div>

      <!-- Main Layout: Sidebar Navigation + Content Area -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Sidebar Navigation -->
        <aside class="lg:col-span-4 sticky top-24 space-y-2">
          <div class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
            <div class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Guide Navigation
            </div>

            @for (sec of sections; track sec.id) {
              <button
                type="button"
                (click)="activeSection.set(sec.id)"
                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-2"
                [ngClass]="{
                  'bg-indigo-600 text-white shadow-md shadow-indigo-600/20': activeSection() === sec.id,
                  'text-slate-300 hover:bg-slate-800/60 hover:text-white': activeSection() !== sec.id
                }"
              >
                <div class="flex items-center gap-2.5 truncate">
                  <i [class]="sec.icon" [ngClass]="activeSection() === sec.id ? 'text-white' : 'text-indigo-400'"></i>
                  <span class="truncate">{{ sec.title }}</span>
                </div>
                @if (sec.badge) {
                  <span
                    class="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                    [ngClass]="activeSection() === sec.id ? 'bg-indigo-900/80 text-white' : 'bg-slate-800 text-slate-400'"
                  >
                    {{ sec.badge }}
                  </span>
                }
              </button>
            }
          </div>

          <!-- Quick Interactive Help Card -->
          <div class="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
            <div class="flex items-center gap-2 text-xs font-bold text-white">
              <i class="pi pi-bolt text-amber-400"></i>
              <span>Need Direct API Docs?</span>
            </div>
            <p class="text-xs text-slate-400">
              Access the interactive Swagger UI OpenAPI documentation:
            </p>
            <a
              href="http://localhost:3000/docs"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              <span>Open Swagger UI</span>
              <i class="pi pi-external-link text-[10px]"></i>
            </a>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="lg:col-span-8 glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-8">
          <!-- 1. System Overview -->
          @if (activeSection() === 'overview') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Chapter 1</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Platform Architecture & Ecosystem</h2>
              </div>

              <p class="text-sm text-slate-300 leading-relaxed">
                <strong>EventHub</strong> is an enterprise event management and ticketing platform designed with mathematical certainty against overselling, resilient JWT token rotation, and rich real-time analytics.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div class="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    <i class="pi pi-user"></i>
                  </div>
                  <h3 class="text-sm font-bold text-white">Attendee</h3>
                  <p class="text-xs text-slate-400">Search events, book seats, view tickets, and manage cancellations.</p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div class="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <i class="pi pi-calendar-plus"></i>
                  </div>
                  <h3 class="text-sm font-bold text-white">Organizer</h3>
                  <p class="text-xs text-slate-400">Host events, monitor live occupancy, download CSV rosters, view GraphQL metrics.</p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div class="w-8 h-8 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold text-xs">
                    <i class="pi pi-shield"></i>
                  </div>
                  <h3 class="text-sm font-bold text-white">Administrator</h3>
                  <p class="text-xs text-slate-400">Global system oversight, user account management, and role promotions.</p>
                </div>
              </div>

              <div class="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-2">
                <div class="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <i class="pi pi-info-circle"></i>
                  <span>Zero-Trust Token Management</span>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Access tokens are held in-memory only (in the NgRx SignalStore) and are never placed in <code class="bg-indigo-950 px-1 py-0.5 rounded text-indigo-200">localStorage</code>. When expired, the functional HTTP interceptor synchronizes concurrent requests to rotate the refresh token without collision.
                </p>
              </div>
            </section>
          }

          <!-- 2. Attendee Guide -->
          @if (activeSection() === 'attendee') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Chapter 2</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Attendee User Guide</h2>
              </div>

              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">1</span>
                    Discovering Events
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Navigate to <strong class="text-white">Discover</strong> (<code class="text-indigo-300">/events</code>). You can filter events by venue, search titles and descriptions with live 300ms debounce, and sort by starting date or price.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">2</span>
                    Reserving Seats
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Open an event detail page. Select your desired number of seats (up to the remaining capacity). The total price is calculated live. Click <strong class="text-white">Confirm Booking</strong>. Your reservation is processed with pessimistic database row-locking.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center text-[10px] font-bold">3</span>
                    Managing Reservations & Cancellation
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Visit <strong class="text-white">My Bookings</strong> (<code class="text-indigo-300">/bookings</code>). You can review all confirmed tickets. If an event has not yet started, you may cancel your reservation, which returns the reserved seats to the event's availability pool immediately.
                  </p>
                </div>
              </div>
            </section>
          }

          <!-- 3. Organizer Guide -->
          @if (activeSection() === 'organizer') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Chapter 3</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Organizer User Guide</h2>
              </div>

              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="pi pi-plus-circle text-indigo-400"></i>
                    Creating & Publishing Events
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Click <strong class="text-white">Host Event</strong> to open the creation form. Set the title, venue, price (in dollars), capacity, and start time. Event start times must be in the future. You can publish immediately or save as a draft.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="pi pi-chart-pie text-indigo-400"></i>
                    GraphQL Analytics Dashboard
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    The <strong class="text-white">Organizer Hub</strong> queries the GraphQL <code class="text-indigo-300">/graphql</code> endpoint to calculate Gross Revenue, Total Bookings, and Average Occupancy across all events without N+1 query overhead.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="pi pi-download text-indigo-400"></i>
                    Exporting Attendee CSV Rosters
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    From your event roster page, click <strong class="text-white">Download CSV</strong>. The server streams the list of attendees directly to your browser with built-in formula injection protection.
                  </p>
                </div>
              </div>
            </section>
          }

          <!-- 4. Admin Guide -->
          @if (activeSection() === 'admin') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-purple-400 uppercase tracking-wider">Chapter 4</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Administrator User Guide</h2>
              </div>

              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="pi pi-gauge text-purple-400"></i>
                    Admin Command Center
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Located at <code class="text-purple-300">/admin</code>, this dashboard displays global ecosystem volume, total platform users, live active events, and recent account registrations.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h3 class="text-sm font-bold text-white flex items-center gap-2">
                    <i class="pi pi-users text-purple-400"></i>
                    User Management & Role Elevation
                  </h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Under <strong class="text-white">Users</strong> (<code class="text-purple-300">/admin/users</code>), administrators can search accounts by name or email, filter by role, promote attendees to organizers or admins via the table dropdown, and remove defunct accounts with self-deletion guards.
                  </p>
                </div>
              </div>
            </section>
          }

          <!-- 5. Concurrency Controls -->
          @if (activeSection() === 'concurrency') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Chapter 5</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Concurrency & Concurrency Locking</h2>
              </div>

              <p class="text-sm text-slate-300 leading-relaxed">
                When popular events have only 1 or 2 tickets remaining and hundreds of users attempt to purchase simultaneously, traditional ORM operations lead to race conditions and overselling.
              </p>

              <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs text-slate-300">
                <div class="text-indigo-400 font-bold">// Atomic Transaction in PostgreSQL</div>
                <p>1. BEGIN TRANSACTION</p>
                <p>2. SELECT * FROM "Event" WHERE id = $1 FOR UPDATE;</p>
                <p>3. Check (seatsTaken + requestedSeats &lt;= capacity)</p>
                <p>4. INSERT INTO "Booking" ...</p>
                <p>5. UPDATE "Event" SET "seatsTaken" = "seatsTaken" + $2 ...</p>
                <p>6. COMMIT;</p>
              </div>

              <p class="text-xs text-slate-400">
                The database also enforces a strict SQL constraint: <code class="text-cyan-300">CHECK (seats_taken &lt;= capacity)</code>, guaranteeing that even in the presence of application errors, the database will refuse overbooking.
              </p>
            </section>
          }

          <!-- 6. API Reference -->
          @if (activeSection() === 'api') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-amber-400 uppercase tracking-wider">Chapter 6</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">API Reference & Rate Limiting</h2>
              </div>

              <div class="space-y-4">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                    <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th class="p-3">Route</th>
                        <th class="p-3">Method</th>
                        <th class="p-3">Role Required</th>
                        <th class="p-3">Rate Limit</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      <tr>
                        <td class="p-3 font-mono text-indigo-300">/api/v1/auth/register</td>
                        <td class="p-3 font-bold text-emerald-400">POST</td>
                        <td class="p-3">Public</td>
                        <td class="p-3">3 / hr / IP</td>
                      </tr>
                      <tr>
                        <td class="p-3 font-mono text-indigo-300">/api/v1/auth/login</td>
                        <td class="p-3 font-bold text-emerald-400">POST</td>
                        <td class="p-3">Public</td>
                        <td class="p-3">5 fails / 15m</td>
                      </tr>
                      <tr>
                        <td class="p-3 font-mono text-indigo-300">/api/v1/events</td>
                        <td class="p-3 font-bold text-cyan-400">GET / POST</td>
                        <td class="p-3">Public / Organizer</td>
                        <td class="p-3">Standard</td>
                      </tr>
                      <tr>
                        <td class="p-3 font-mono text-indigo-300">/api/v1/bookings</td>
                        <td class="p-3 font-bold text-emerald-400">POST</td>
                        <td class="p-3">Authenticated</td>
                        <td class="p-3">10 / min</td>
                      </tr>
                      <tr>
                        <td class="p-3 font-mono text-indigo-300">/api/v1/users</td>
                        <td class="p-3 font-bold text-purple-400">GET / PATCH</td>
                        <td class="p-3 font-bold text-purple-400">Admin</td>
                        <td class="p-3">Standard</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 space-y-1">
                  <div class="font-bold flex items-center gap-2">
                    <i class="pi pi-clock"></i>
                    <span>Rate Limit 429 Cooldown Feedback</span>
                  </div>
                  <p class="text-slate-300">
                    When endpoints hit rate limits, the response includes the standard <code class="text-amber-300">RateLimit-Reset</code> header. The frontend automatically parses this header and displays a real-time countdown banner to the user.
                  </p>
                </div>
              </div>
            </section>
          }

          <!-- 7. Interactive FAQ -->
          @if (activeSection() === 'faq') {
            <section class="space-y-6">
              <div class="border-b border-slate-800 pb-4">
                <span class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Chapter 7</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">Frequently Asked Questions</h2>
              </div>

              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <h3 class="text-sm font-bold text-white">Why is my booking rejected with "SOLD_OUT"?</h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Another attendee completed their reservation milliseconds prior. The system automatically refetches the live availability and updates your seat selector in real time.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <h3 class="text-sm font-bold text-white">Can I cancel a booking after an event has started?</h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    No. The cancellation policy disables ticket returns once the starting time (<code class="text-indigo-300">startsAt</code>) has passed.
                  </p>
                </div>

                <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <h3 class="text-sm font-bold text-white">How do I get an Admin account?</h3>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    For security, public registration only permits <strong class="text-emerald-300">Attendee</strong> and <strong class="text-indigo-300">Organizer</strong> accounts. Existing administrators can promote any user to an Admin role via the <strong class="text-purple-300">User Management</strong> portal.
                  </p>
                </div>
              </div>
            </section>
          }
        </main>
      </div>
    </div>
  `,
})
export class DocsComponent {
  activeSection = signal<string>('overview');

  readonly sections: DocSection[] = [
    {
      id: 'overview',
      title: 'Platform Overview',
      category: 'General',
      icon: 'pi pi-compass',
      badge: 'Core',
    },
    {
      id: 'attendee',
      title: 'Attendee User Guide',
      category: 'Role Guides',
      icon: 'pi pi-user',
      badge: 'Booking',
    },
    {
      id: 'organizer',
      title: 'Organizer User Guide',
      category: 'Role Guides',
      icon: 'pi pi-calendar-plus',
      badge: 'Hosting',
    },
    {
      id: 'admin',
      title: 'Administrator Guide',
      category: 'Role Guides',
      icon: 'pi pi-shield',
      badge: 'Admin',
    },
    {
      id: 'concurrency',
      title: 'Concurrency Controls',
      category: 'Architecture',
      icon: 'pi pi-lock',
    },
    {
      id: 'api',
      title: 'API & Rate Limits',
      category: 'Technical',
      icon: 'pi pi-server',
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      category: 'Support',
      icon: 'pi pi-question-circle',
    },
  ];
}
