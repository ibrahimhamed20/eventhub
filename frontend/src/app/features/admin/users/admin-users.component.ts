import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersApiService } from '../../../core/http/users-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { User, UserRole } from '../../../core/models/auth.model';
import {
  UserSummary,
  ListUsersParams,
} from '../../../core/models/user.model';
import { Pagination } from '../../../core/models/api.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-6xl mx-auto space-y-8 pb-16">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">
              Admin Portal
            </span>
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight mt-1">User Management</h1>
          <p class="text-sm text-slate-400">View registered accounts, modify access roles, and oversee platform users</p>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/admin"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Admin Overview
          </a>
        </div>
      </div>

      <!-- Action Feedback Banner -->
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

      <!-- Summary Stats Grid -->
      @if (summary(); as sum) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="glass-panel p-4 rounded-2xl border border-slate-800">
            <span class="text-[11px] font-semibold text-slate-400 block">Total Users</span>
            <span class="text-2xl font-extrabold text-white mt-1 block">{{ sum.total }}</span>
          </div>
          <div class="glass-panel p-4 rounded-2xl border border-slate-800">
            <span class="text-[11px] font-semibold text-emerald-400 block">Attendees</span>
            <span class="text-2xl font-extrabold text-emerald-300 mt-1 block">{{ sum.attendees }}</span>
          </div>
          <div class="glass-panel p-4 rounded-2xl border border-slate-800">
            <span class="text-[11px] font-semibold text-indigo-400 block">Organizers</span>
            <span class="text-2xl font-extrabold text-indigo-300 mt-1 block">{{ sum.organizers }}</span>
          </div>
          <div class="glass-panel p-4 rounded-2xl border border-slate-800">
            <span class="text-[11px] font-semibold text-purple-400 block">Admins</span>
            <span class="text-2xl font-extrabold text-purple-300 mt-1 block">{{ sum.admins }}</span>
          </div>
        </div>
      }

      <!-- Filters Toolbar -->
      <section aria-label="User search and filters" class="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div class="md:col-span-6 relative">
            <i class="pi pi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
            <input
              type="text"
              [formControl]="searchControl"
              placeholder="Search user by name or email..."
              class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div class="md:col-span-3">
            <select
              [formControl]="roleFilterControl"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="attendee">Attendees Only</option>
              <option value="organizer">Organizers Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>

          <div class="md:col-span-3">
            <select
              [formControl]="sortControl"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="createdAt:desc">Newest Registered</option>
              <option value="createdAt:asc">Oldest Registered</option>
              <option value="fullName:asc">Name: A to Z</option>
              <option value="email:asc">Email: A to Z</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Users Table -->
      @if (isLoading()) {
        <div class="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <i class="pi pi-spin pi-spinner text-3xl text-purple-400"></i>
          <p class="text-xs text-slate-400">Loading user accounts...</p>
        </div>
      } @else if (error()) {
        <div class="glass-panel p-10 rounded-2xl border border-rose-800/50 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto text-xl">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Failed to load users</h2>
          <p class="text-sm text-slate-400">{{ error() }}</p>
          <button
            type="button"
            (click)="loadUsers()"
            class="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow"
          >
            Retry
          </button>
        </div>
      } @else if (users().length === 0) {
        <div class="glass-panel p-12 rounded-2xl border border-slate-800 text-center space-y-3">
          <i class="pi pi-users text-3xl text-slate-500"></i>
          <h2 class="text-base font-bold text-white">No users found</h2>
          <p class="text-xs text-slate-400">No accounts match the current filter criteria.</p>
        </div>
      } @else {
        <section aria-label="Users list" class="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-900/90 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th scope="col" class="px-5 py-3.5">User</th>
                  <th scope="col" class="px-4 py-3.5">Email</th>
                  <th scope="col" class="px-4 py-3.5">Role</th>
                  <th scope="col" class="px-4 py-3.5">Joined Date</th>
                  <th scope="col" class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                @for (u of users(); track u.id) {
                  <tr class="hover:bg-slate-800/40 transition-colors">
                    <!-- Name & Avatar -->
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center text-xs">
                          {{ u.fullName.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="font-bold text-white text-sm">{{ u.fullName }}</div>
                          <span class="text-[10px] text-slate-500 font-mono">ID #{{ u.id }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Email -->
                    <td class="px-4 py-4 font-mono text-slate-300">
                      {{ u.email }}
                    </td>

                    <!-- Role Badge -->
                    <td class="px-4 py-4">
                      @if (u.role === 'admin') {
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                          Admin
                        </span>
                      } @else if (u.role === 'organizer') {
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          Organizer
                        </span>
                      } @else {
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Attendee
                        </span>
                      }
                    </td>

                    <!-- Joined Date -->
                    <td class="px-4 py-4 text-slate-400">
                      {{ u.createdAt | date: 'mediumDate' }}
                    </td>

                    <!-- Actions -->
                    <td class="px-5 py-4 text-right">
                      <div class="inline-flex items-center gap-2">
                        <!-- Role Selector Dropdown -->
                        <select
                          [value]="u.role"
                          (change)="onRoleSelectChange(u, $event)"
                          [disabled]="u.id === authStore.currentUserId()"
                          class="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="attendee">Attendee</option>
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>

                        @if (u.id !== authStore.currentUserId()) {
                          <button
                            type="button"
                            (click)="confirmDeleteUser(u)"
                            class="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-400 border border-rose-800/80 transition-colors"
                            title="Delete User"
                          >
                            <i class="pi pi-trash text-xs"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (pagination(); as pag) {
            @if (pag.totalPages > 1) {
              <div class="p-4 border-t border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-400">
                  Page {{ pag.page }} of {{ pag.totalPages }} ({{ pag.total }} total)
                </span>
                <div class="flex gap-2">
                  <button
                    type="button"
                    [disabled]="pag.page <= 1"
                    (click)="goToPage(pag.page - 1)"
                    class="px-3 py-1.5 rounded-lg text-xs bg-slate-800 disabled:opacity-40 text-slate-200"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    [disabled]="pag.page >= pag.totalPages"
                    (click)="goToPage(pag.page + 1)"
                    class="px-3 py-1.5 rounded-lg text-xs bg-slate-800 disabled:opacity-40 text-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            }
          }
        </section>
      }

      <!-- Delete User Confirmation Modal -->
      @if (pendingDeleteUser(); as pending) {
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div class="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <div class="w-12 h-12 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center text-xl">
              <i class="pi pi-user-minus"></i>
            </div>
            <h2 id="delete-user-title" class="text-lg font-bold text-white">Delete User Account?</h2>
            <p class="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete <strong class="text-white">{{ pending.fullName }}</strong> ({{ pending.email }})?
              All associated bookings and tokens will be permanently removed.
            </p>
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="pendingDeleteUser.set(null)"
                class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="executeDeleteUser(pending.id)"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  private readonly usersApi = inject(UsersApiService);
  private readonly errorHandler = inject(ErrorHandlerService);

  users = signal<User[]>([]);
  summary = signal<UserSummary | null>(null);
  pagination = signal<Pagination | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  actionMessage = signal<string | null>(null);
  actionError = signal<string | null>(null);
  pendingDeleteUser = signal<User | null>(null);

  searchControl = new FormControl('', { nonNullable: true });
  roleFilterControl = new FormControl<string>('', { nonNullable: true });
  sortControl = new FormControl('createdAt:desc', { nonNullable: true });

  currentPage = signal(1);
  pageSize = signal(10);

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadUsers();
      });

    this.roleFilterControl.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });

    this.sortControl.valueChanges.subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });

    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const [sortBy, sortOrder] = this.sortControl.value.split(':') as [
      'createdAt' | 'fullName' | 'email' | 'role',
      'asc' | 'desc'
    ];

    const roleVal = this.roleFilterControl.value as UserRole | '';

    const params: ListUsersParams = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchControl.value.trim() || undefined,
      role: roleVal || undefined,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };

    this.usersApi.listUsers(params).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.pagination.set(res.pagination);
        this.summary.set(res.summary);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  onRoleSelectChange(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value as UserRole;

    if (newRole === user.role) return;

    this.actionMessage.set(null);
    this.actionError.set(null);

    this.usersApi.updateUserRole(user.id, newRole).subscribe({
      next: (updatedUser) => {
        this.actionMessage.set(`Role for ${updatedUser.fullName} updated to ${updatedUser.role}.`);
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, role: updatedUser.role } : u))
        );
        this.loadUsers();
      },
      error: (err) => {
        select.value = user.role; // rollback select
        this.actionError.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  confirmDeleteUser(user: User): void {
    this.pendingDeleteUser.set(user);
  }

  executeDeleteUser(id: number): void {
    this.pendingDeleteUser.set(null);
    this.actionMessage.set(null);
    this.actionError.set(null);

    this.usersApi.deleteUser(id).subscribe({
      next: () => {
        this.actionMessage.set('User deleted successfully.');
        this.loadUsers();
      },
      error: (err) => {
        this.actionError.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }
}
