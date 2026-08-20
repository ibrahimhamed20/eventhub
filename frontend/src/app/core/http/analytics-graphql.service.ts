import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  OrganizerStatsGQL,
  EventStatsGQL,
  GraphQLResponse,
} from '../models/analytics.model';

export interface OrganizerDashboardData {
  organizerStats: OrganizerStatsGQL;
  myEvents: EventStatsGQL[];
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsGraphqlService {
  private readonly http = inject(HttpClient);
  private readonly graphqlUrl = environment.graphqlUrl;

  /**
   * Executes a GraphQL query against /graphql
   * Leverages HttpClient so that auth headers and refresh interceptors apply automatically.
   */
  private query<T>(query: string, variables?: Record<string, unknown>): Observable<T> {
    return this.http
      .post<GraphQLResponse<T>>(this.graphqlUrl, { query, variables })
      .pipe(
        map((response) => {
          if (response.errors && response.errors.length > 0) {
            throw new Error(response.errors[0]?.message || 'GraphQL Query Error');
          }
          if (!response.data) {
            throw new Error('No data returned from GraphQL endpoint');
          }
          return response.data;
        })
      );
  }

  getOrganizerDashboardData(limit = 50): Observable<OrganizerDashboardData> {
    const query = `
      query GetOrganizerDashboard($limit: Int) {
        organizerStats {
          totalEvents
          publishedEvents
          totalBookings
          totalRevenueCents
          averageOccupancy
        }
        myEvents(limit: $limit) {
          id
          title
          venue
          startsAt
          status
          capacity
          seatsTaken
          seatsAvailable
          occupancyRate
          bookingCount
          revenueCents
        }
      }
    `;
    return this.query<OrganizerDashboardData>(query, { limit });
  }

  getEventStats(id: number): Observable<EventStatsGQL | null> {
    const query = `
      query GetEventStats($id: Int!) {
        eventStats(id: $id) {
          id
          title
          venue
          startsAt
          status
          capacity
          seatsTaken
          seatsAvailable
          occupancyRate
          bookingCount
          revenueCents
          attendees {
            bookingId
            fullName
            email
            seats
            totalCents
            bookedAt
          }
        }
      }
    `;
    return this.query<{ eventStats: EventStatsGQL | null }>(query, { id }).pipe(
      map((res) => res.eventStats)
    );
  }
}
