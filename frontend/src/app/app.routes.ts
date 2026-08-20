import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'events',
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./features/events/event-list/event-list.component').then(
        (m) => m.EventListComponent
      ),
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./features/events/event-detail/event-detail.component').then(
        (m) => m.EventDetailComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/bookings/my-bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent
      ),
  },
  {
    path: 'organizer',
    canActivate: [roleGuard(['organizer', 'admin'])],
    loadComponent: () =>
      import(
        './features/organizer/dashboard/organizer-dashboard.component'
      ).then((m) => m.OrganizerDashboardComponent),
  },
  {
    path: 'organizer/events/new',
    canActivate: [roleGuard(['organizer', 'admin'])],
    loadComponent: () =>
      import('./features/organizer/event-form/event-form.component').then(
        (m) => m.EventFormComponent
      ),
  },
  {
    path: 'organizer/events/:id/edit',
    canActivate: [roleGuard(['organizer', 'admin'])],
    loadComponent: () =>
      import('./features/organizer/event-form/event-form.component').then(
        (m) => m.EventFormComponent
      ),
  },
  {
    path: 'organizer/events/:id/attendees',
    canActivate: [roleGuard(['organizer', 'admin'])],
    loadComponent: () =>
      import(
        './features/organizer/attendees/event-attendees.component'
      ).then((m) => m.EventAttendeesComponent),
  },
  {
    path: '**',
    redirectTo: 'events',
  },
];
