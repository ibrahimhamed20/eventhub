import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Booking, CreateBookingRequest } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/bookings`;

  createBooking(payload: CreateBookingRequest): Observable<Booking> {
    return this.http
      .post<{ booking: Booking }>(this.baseUrl, payload)
      .pipe(map((res) => res.booking));
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http
      .get<{ bookings: Booking[] }>(`${this.baseUrl}/mine`)
      .pipe(map((res) => res.bookings));
  }

  getBookingById(id: number): Observable<Booking> {
    return this.http
      .get<{ booking: Booking }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.booking));
  }

  cancelBooking(id: number): Observable<Booking> {
    return this.http
      .patch<{ booking: Booking }>(`${this.baseUrl}/${id}/cancel`, {})
      .pipe(map((res) => res.booking));
  }
}
