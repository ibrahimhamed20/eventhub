import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthApiService } from '../../../core/http/auth-api.service';
import { ErrorHandlerService } from '../../../core/http/error-handler.service';
import { RegisterRequest } from '../../../core/models/auth.model';

interface RegisterForm {
  fullName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  role: FormControl<'attendee' | 'organizer'>;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-lg space-y-8 glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
        <!-- Header -->
        <div class="text-center space-y-2">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-2">
            <i class="pi pi-user-plus text-xl"></i>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-white">Create an Account</h1>
          <p class="text-sm text-slate-400">Join EventHub to discover conferences or host your own</p>
        </div>

        <!-- General Error Alert -->
        @if (errorMessage()) {
          <div
            role="alert"
            class="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3"
          >
            <i class="pi pi-exclamation-circle text-rose-400 text-base mt-0.5"></i>
            <div class="flex-1">
              <p class="font-medium">{{ errorMessage() }}</p>
              @if (authStore.rateLimitCooldownSec(); as cooldown) {
                <p class="text-xs text-rose-300/80 mt-1 font-mono">
                  Rate limit reached: please retry in {{ cooldown }}s
                </p>
              }
            </div>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5" novalidate>
          <!-- Full Name -->
          <div class="space-y-1.5">
            <label for="fullName" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              formControlName="fullName"
              placeholder="Alex Johnson"
              autocomplete="name"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              [ngClass]="{
                'border-rose-500 focus:border-rose-500 focus:ring-rose-500':
                  form.controls.fullName.touched && form.controls.fullName.invalid,
                'border-slate-800 focus:border-indigo-500':
                  !(form.controls.fullName.touched && form.controls.fullName.invalid)
              }"
            />
            @if (form.controls.fullName.touched && form.controls.fullName.errors) {
              <p class="text-xs text-rose-400 mt-1">
                @if (form.controls.fullName.errors['required']) {
                  Full name is required.
                } @else if (form.controls.fullName.errors['serverError']) {
                  {{ form.controls.fullName.errors['serverError'] }}
                }
              </p>
            }
          </div>

          <!-- Email Address -->
          <div class="space-y-1.5">
            <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="alex@example.com"
              autocomplete="email"
              class="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              [ngClass]="{
                'border-rose-500 focus:border-rose-500 focus:ring-rose-500':
                  form.controls.email.touched && form.controls.email.invalid,
                'border-slate-800 focus:border-indigo-500':
                  !(form.controls.email.touched && form.controls.email.invalid)
              }"
            />
            @if (form.controls.email.touched && form.controls.email.errors) {
              <p class="text-xs text-rose-400 mt-1">
                @if (form.controls.email.errors['required']) {
                  Email is required.
                } @else if (form.controls.email.errors['email']) {
                  Please enter a valid email address.
                } @else if (form.controls.email.errors['serverError']) {
                  {{ form.controls.email.errors['serverError'] }}
                }
              </p>
            }
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password <span class="text-slate-500 font-normal lowercase">(min 8 characters)</span>
            </label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="new-password"
                class="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-900/90 border text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                [ngClass]="{
                  'border-rose-500 focus:border-rose-500 focus:ring-rose-500':
                    form.controls.password.touched && form.controls.password.invalid,
                  'border-slate-800 focus:border-indigo-500':
                    !(form.controls.password.touched && form.controls.password.invalid)
                }"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                aria-label="Toggle password visibility"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm"
              >
                <i [class]="showPassword() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
              </button>
            </div>
            @if (form.controls.password.touched && form.controls.password.errors) {
              <p class="text-xs text-rose-400 mt-1">
                @if (form.controls.password.errors['required']) {
                  Password is required.
                } @else if (form.controls.password.errors['minlength']) {
                  Password must be at least 8 characters long.
                } @else if (form.controls.password.errors['serverError']) {
                  {{ form.controls.password.errors['serverError'] }}
                }
              </p>
            }
          </div>

          <!-- Role Selection (Attendee vs Organizer ONLY) -->
          <div class="space-y-2 pt-1">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Account Type
            </label>
            <div class="grid grid-cols-2 gap-3">
              <!-- Attendee -->
              <label
                class="flex flex-col p-3 rounded-xl border cursor-pointer transition-all"
                [ngClass]="{
                  'bg-indigo-950/40 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500':
                    form.controls.role.value === 'attendee',
                  'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700':
                    form.controls.role.value !== 'attendee'
                }"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-200">Attendee</span>
                  <input
                    type="radio"
                    formControlName="role"
                    value="attendee"
                    class="text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <span class="text-[11px] text-slate-400 leading-tight">Discover & book events</span>
              </label>

              <!-- Organizer -->
              <label
                class="flex flex-col p-3 rounded-xl border cursor-pointer transition-all"
                [ngClass]="{
                  'bg-indigo-950/40 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500':
                    form.controls.role.value === 'organizer',
                  'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700':
                    form.controls.role.value !== 'organizer'
                }"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-slate-200">Organizer</span>
                  <input
                    type="radio"
                    formControlName="role"
                    value="organizer"
                    class="text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <span class="text-[11px] text-slate-400 leading-tight">Create & host events</span>
              </label>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="isSubmitting() || (authStore.rateLimitCooldownSec() ?? 0) > 0"
            class="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
          >
            @if (isSubmitting()) {
              <i class="pi pi-spin pi-spinner text-sm"></i>
              <span>Creating account...</span>
            } @else {
              <span>Create Account</span>
              <i class="pi pi-arrow-right text-xs"></i>
            }
          </button>
        </form>

        <!-- Footer link -->
        <div class="text-center pt-2">
          <p class="text-sm text-slate-400">
            Already have an account?
            <a routerLink="/login" class="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  readonly authStore = inject(AuthStore);
  private readonly authApi = inject(AuthApiService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly router = inject(Router);

  form = new FormGroup<RegisterForm>({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    role: new FormControl<'attendee' | 'organizer'>('attendee', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: RegisterRequest = {
      fullName: this.form.controls.fullName.value.trim(),
      email: this.form.controls.email.value.trim(),
      password: this.form.controls.password.value,
      role: this.form.controls.role.value,
    };

    this.authApi.register(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.authStore.setAuth(response);

        if (response.user.role === 'organizer') {
          this.router.navigate(['/organizer']);
        } else {
          this.router.navigate(['/events']);
        }
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
