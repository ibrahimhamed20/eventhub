import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Event,
  CreateEventRequest,
  UpdateEventRequest,
  ListEventsParams,
} from '../models/event.model';
import { PaginatedResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class EventsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/events`;

  listEvents(params: ListEventsParams = {}): Observable<PaginatedResponse<Event>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.venue?.trim()) httpParams = httpParams.set('venue', params.venue.trim());
    if (params.organizerId !== undefined) httpParams = httpParams.set('organizerId', params.organizerId.toString());
    if (params.startsAfter) httpParams = httpParams.set('startsAfter', params.startsAfter);
    if (params.startsBefore) httpParams = httpParams.set('startsBefore', params.startsBefore);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);

    return this.http.get<PaginatedResponse<Event>>(this.baseUrl, { params: httpParams });
  }

  getEventById(id: number): Observable<Event> {
    return this.http
      .get<{ event: Event }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.event));
  }

  getOrganizerEvents(): Observable<Event[]> {
    return this.http
      .get<{ events: Event[] }>(`${this.baseUrl}/mine`)
      .pipe(map((res) => res.events));
  }

  createEvent(payload: CreateEventRequest): Observable<Event> {
    return this.http
      .post<{ event: Event }>(this.baseUrl, payload)
      .pipe(map((res) => res.event));
  }

  updateEvent(id: number, payload: UpdateEventRequest): Observable<Event> {
    return this.http
      .patch<{ event: Event }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.event));
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Fetches attendee CSV stream as a Blob and triggers direct browser download.
   * Streaming requires Authorization header so plain <a href> cannot be used.
   */
  downloadAttendeesCsv(eventId: number): Observable<void> {
    return this.http
      .get(`${this.baseUrl}/${eventId}/attendees.csv`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response: HttpResponse<Blob>) => {
          const blob = response.body;
          if (!blob) {
            throw new Error('Empty CSV file received');
          }

          // Extract filename from Content-Disposition if present
          let filename = `event-${eventId}-attendees.csv`;
          const contentDisposition = response.headers.get('Content-Disposition');
          if (contentDisposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (matches && matches[1]) {
              filename = matches[1].replace(/['"]/g, '');
            }
          }

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
      );
  }
}
