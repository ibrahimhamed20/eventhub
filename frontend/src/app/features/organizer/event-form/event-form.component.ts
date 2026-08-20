import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventsApiService } from '../../../core/http/events-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  EventStatus,
} from '../../../core/models/event.model';

interface EventFormControls {
  title: FormControl<string>;
  description: FormControl<string>;
  venue: FormControl<string>;
  startsAt: FormControl<string>;
  capacity: FormControl<number>;
  priceDollars: FormControl<number>;
  status: FormControl<EventStatus>;
}

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto space-y-8 pb-16">
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

      <!-- Main Form Card -->
      <div class="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <!-- Form Header -->
        <div class="border-b border-slate-800 pb-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight">
              {{ isEditMode() ? 'Edit Event Details' : 'Create New Event' }}
            </h1>
            <p class="text-xs text-slate-400 mt-1">
              {{ isEditMode() ? 'Update details, pricing, or publish status' : 'Fill in event specifics to launch ticket reservations' }}
            </p>
          </div>

          @if (isEditMode() && existingEvent()) {
            <span
              class="px-3 py-1 rounded-full text-xs font-bold"
              [ngClass]="{
                'bg-emerald-950 text-emerald-300 border border-emerald-800': existingEvent()?.status === 'published',
                'bg-amber-950 text-amber-300 border border-amber-800': existingEvent()?.status === 'draft',
                'bg-rose-950 text-rose-300 border border-rose-800': existingEvent()?.status === 'cancelled'
              }"
            >
              {{ existingEvent()?.status | uppercase }}
            </span>
          }
        </div>

        <!-- General Error Alert -->
        @if (errorMessage()) {
          <div
            role="alert"
            class="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-3"
          >
            <i class="pi pi-exclamation-circle text-rose-400 text-sm mt-0.5"></i>
            <div class="flex-1">
              <p class="font-medium">{{ errorMessage() }}</p>
            </div>
          </div>
        }

        @if (isLoading()) {
          <div class="p-12 text-center text-slate-400">
            <i class="pi pi-spin pi-spinner text-2xl text-indigo-400 mb-2"></i>
            <p class="text-xs">Loading event details...</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6" novalidate>
            <!-- Title -->
            <div class="space-y-1.5">
              <label for="title" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Event Title *
              </label>
              <input
                id="title"
                type="text"
                formControlName="title"
                placeholder="e.g. NextGen Web Architecture Summit 2026"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                [ngClass]="{
                  'border-rose-500': form.controls.title.touched && form.controls.title.invalid,
                  'border-slate-800': !(form.controls.title.touched && form.controls.title.invalid)
                }"
              />
              @if (form.controls.title.touched && form.controls.title.errors) {
                <p class="text-xs text-rose-400 mt-1">
                  @if (form.controls.title.errors['required']) { Event title is required. }
                  @else if (form.controls.title.errors['serverError']) { {{ form.controls.title.errors['serverError'] }} }
                </p>
              }
            </div>

            <!-- Description -->
            <div class="space-y-1.5">
              <label for="description" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Description
              </label>
              <textarea
                id="description"
                rows="4"
                formControlName="description"
                placeholder="Key themes, keynote speakers, prerequisites, schedule highlights..."
                class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              ></textarea>
            </div>

            <!-- Venue -->
            <div class="space-y-1.5">
              <label for="venue" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Venue Location *
              </label>
              <input
                id="venue"
                type="text"
                formControlName="venue"
                placeholder="e.g. Moscone Center, San Francisco or Virtual Stream"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                [ngClass]="{
                  'border-rose-500': form.controls.venue.touched && form.controls.venue.invalid,
                  'border-slate-800': !(form.controls.venue.touched && form.controls.venue.invalid)
                }"
              />
              @if (form.controls.venue.touched && form.controls.venue.errors) {
                <p class="text-xs text-rose-400 mt-1">Venue is required.</p>
              }
            </div>

            <!-- Starts At & Price Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Starts At -->
              <div class="space-y-1.5">
                <label for="startsAt" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Starts At (Date & Time) *
                </label>
                <input
                  id="startsAt"
                  type="datetime-local"
                  formControlName="startsAt"
                  class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  [ngClass]="{
                    'border-rose-500': form.controls.startsAt.touched && form.controls.startsAt.invalid,
                    'border-slate-800': !(form.controls.startsAt.touched && form.controls.startsAt.invalid)
                  }"
                />
                @if (form.controls.startsAt.touched && form.controls.startsAt.errors) {
                  <p class="text-xs text-rose-400 mt-1">
                    @if (form.controls.startsAt.errors['required']) { Date and time are required. }
                    @else if (form.controls.startsAt.errors['mustBeFuture']) { Date must be set in the future. }
                    @else if (form.controls.startsAt.errors['serverError']) { {{ form.controls.startsAt.errors['serverError'] }} }
                  </p>
                }
              </div>

              <!-- Price (in Dollars) -->
              <div class="space-y-1.5">
                <label for="priceDollars" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Ticket Price (USD) *
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                  <input
                    id="priceDollars"
                    type="number"
                    step="0.01"
                    min="0"
                    formControlName="priceDollars"
                    placeholder="0.00"
                    class="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    [ngClass]="{
                      'border-rose-500': form.controls.priceDollars.touched && form.controls.priceDollars.invalid,
                      'border-slate-800': !(form.controls.priceDollars.touched && form.controls.priceDollars.invalid)
                    }"
                  />
                </div>
                @if (form.controls.priceDollars.touched && form.controls.priceDollars.errors) {
                  <p class="text-xs text-rose-400 mt-1">Price must be greater than or equal to $0.</p>
                }
              </div>
            </div>

            <!-- Capacity & Status Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Capacity -->
              <div class="space-y-1.5">
                <label for="capacity" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Capacity (Max Seats) *
                </label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  formControlName="capacity"
                  placeholder="100"
                  class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  [ngClass]="{
                    'border-rose-500': form.controls.capacity.touched && form.controls.capacity.invalid,
                    'border-slate-800': !(form.controls.capacity.touched && form.controls.capacity.invalid)
                  }"
                />

                @if (isEditMode() && existingEvent()) {
                  <span class="text-[11px] text-slate-400 block">
                    Current seats booked: <strong class="text-white">{{ existingEvent()?.seatsTaken }}</strong>
                  </span>
                }

                @if (form.controls.capacity.touched && form.controls.capacity.errors) {
                  <p class="text-xs text-rose-400 mt-1">
                    @if (form.controls.capacity.errors['required']) { Capacity is required. }
                    @else if (form.controls.capacity.errors['min']) { Capacity must be at least 1. }
                    @else if (form.controls.capacity.errors['belowSeatsTaken']) {
                      Capacity cannot be less than {{ form.controls.capacity.errors['belowSeatsTaken'].seatsTaken }} seats already booked.
                    }
                    @else if (form.controls.capacity.errors['serverError']) { {{ form.controls.capacity.errors['serverError'] }} }
                  </p>
                }
              </div>

              <!-- Status -->
              <div class="space-y-1.5">
                <label for="status" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Event Status *
                </label>
                <select
                  id="status"
                  formControlName="status"
                  class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="published">Published (Visible & bookable)</option>
                  <option value="draft">Draft (Private to organizer)</option>
                  @if (isEditMode()) {
                    <option value="cancelled">Cancelled (Closed for bookings)</option>
                  }
                </select>
              </div>
            </div>

            <!-- Form Action Buttons -->
            <div class="pt-6 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <div>
                @if (isEditMode()) {
                  <button
                    type="button"
                    (click)="showDeleteDialog.set(true)"
                    class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/80 transition-colors"
                  >
                    <i class="pi pi-trash text-xs mr-1"></i>
                    Delete Event
                  </button>
                }
              </div>

              <div class="flex items-center gap-3">
                <a
                  routerLink="/organizer"
                  class="px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  Cancel
                </a>

                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2"
                >
                  @if (isSubmitting()) {
                    <i class="pi pi-spin pi-spinner text-xs"></i>
                    <span>Saving...</span>
                  } @else {
                    <i class="pi pi-check text-xs"></i>
                    <span>{{ isEditMode() ? 'Save Changes' : 'Create Event' }}</span>
                  }
                </button>
              </div>
            </div>
          </form>
        }
      </div>

      <!-- Delete Confirmation Modal -->
      @if (showDeleteDialog()) {
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div class="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <div class="w-12 h-12 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center text-xl">
              <i class="pi pi-trash"></i>
            </div>
            <h2 id="delete-dialog-title" class="text-lg font-bold text-white">Delete this event?</h2>
            <p class="text-xs text-slate-400">
              Are you sure you want to permanently delete this event?
              Note: Events with existing confirmed bookings cannot be deleted and must be cancelled instead.
            </p>
            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                (click)="showDeleteDialog.set(false)"
                class="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
              >
                Keep Event
              </button>
              <button
                type="button"
                [disabled]="isDeleting()"
                (click)="onDeleteEvent()"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md"
              >
                @if (isDeleting()) { Deleting... } @else { Yes, Delete }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EventFormComponent implements OnInit {
  private readonly eventsApi = inject(EventsApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isEditMode = signal(false);
  eventId = signal<number | null>(null);
  existingEvent = signal<Event | null>(null);
  isLoading = signal(false);
  isSubmitting = signal(false);
  isDeleting = signal(false);
  showDeleteDialog = signal(false);
  errorMessage = signal<string | null>(null);

  form = new FormGroup<EventFormControls>({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    venue: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startsAt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, this.futureDateValidator],
    }),
    capacity: new FormControl(50, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    priceDollars: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    status: new FormControl<EventStatus>('published', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const date = new Date(control.value);
    if (isNaN(date.getTime())) return { invalidDate: true };
    return date > new Date() ? null : { mustBeFuture: true };
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.eventId.set(id);
        this.loadEventForEdit(id);
      }
    } else {
      // Create mode: pre-fill tomorrow at 18:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      tomorrow.setHours(18, 0, 0, 0);
      const iso = tomorrow.toISOString().slice(0, 16);
      this.form.controls.startsAt.setValue(iso);
    }
  }

  loadEventForEdit(id: number): void {
    this.isLoading.set(true);
    this.eventsApi.getEventById(id).subscribe({
      next: (event) => {
        this.existingEvent.set(event);
        this.isLoading.set(false);

        // Format ISO date to datetime-local string (YYYY-MM-DDTHH:mm)
        const dateObj = new Date(event.startsAt);
        const localIso = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        this.form.setValue({
          title: event.title,
          description: event.description || '',
          venue: event.venue,
          startsAt: localIso,
          capacity: event.capacity,
          priceDollars: event.priceCents / 100,
          status: event.status,
        });

        // Add dynamic capacity validator ensuring capacity >= event.seatsTaken
        this.form.controls.capacity.addValidators((control) => {
          if (control.value < event.seatsTaken) {
            return { belowSeatsTaken: { seatsTaken: event.seatsTaken } };
          }
          return null;
        });
        this.form.controls.capacity.updateValueAndValidity();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const fv = this.form.getRawValue();
    const startsAtIso = new Date(fv.startsAt).toISOString();
    const priceCents = Math.round(fv.priceDollars * 100);

    if (this.isEditMode() && this.eventId()) {
      // PATCH: Send only changed fields
      const original = this.existingEvent();
      const patchPayload: UpdateEventRequest = {};

      if (!original || fv.title !== original.title) patchPayload.title = fv.title.trim();
      if (!original || fv.description !== (original.description || ''))
        patchPayload.description = fv.description.trim() || null;
      if (!original || fv.venue !== original.venue) patchPayload.venue = fv.venue.trim();
      if (!original || new Date(startsAtIso).getTime() !== new Date(original.startsAt).getTime())
        patchPayload.startsAt = startsAtIso;
      if (!original || fv.capacity !== original.capacity) patchPayload.capacity = fv.capacity;
      if (!original || priceCents !== original.priceCents) patchPayload.priceCents = priceCents;
      if (!original || fv.status !== original.status) patchPayload.status = fv.status;

      // If nothing changed, return to organizer dashboard
      if (Object.keys(patchPayload).length === 0) {
        this.router.navigate(['/organizer']);
        return;
      }

      this.eventsApi.updateEvent(this.eventId()!, patchPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/organizer']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const parsed = this.errorHandler.parseApiError(err);
          this.errorMessage.set(parsed.message);

          if (parsed.code === 'VALIDATION_ERROR') {
            this.errorHandler.mapValidationErrorsToForm(this.form, parsed.details);
          }
        },
      });
    } else {
      // POST: Create Event
      const createPayload: CreateEventRequest = {
        title: fv.title.trim(),
        description: fv.description.trim() || undefined,
        venue: fv.venue.trim(),
        startsAt: startsAtIso,
        capacity: fv.capacity,
        priceCents,
        status: fv.status === 'cancelled' ? 'draft' : fv.status,
      };

      this.eventsApi.createEvent(createPayload).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/events', created.id]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const parsed = this.errorHandler.parseApiError(err);
          this.errorMessage.set(parsed.message);

          if (parsed.code === 'VALIDATION_ERROR') {
            this.errorHandler.mapValidationErrorsToForm(this.form, parsed.details);
          }
        },
      });
    }
  }

  onDeleteEvent(): void {
    const id = this.eventId();
    if (!id) return;

    this.isDeleting.set(true);
    this.eventsApi.deleteEvent(id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.showDeleteDialog.set(false);
        this.router.navigate(['/organizer']);
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.showDeleteDialog.set(false);
        this.errorMessage.set(this.errorHandler.getUserFacingMessage(err));
      },
    });
  }
}
