export type EventStatus = 'draft' | 'published' | 'cancelled';

export interface Event {
  id: number;
  organizerId: number;
  title: string;
  description: string | null;
  venue: string;
  startsAt: string;
  capacity: number;
  seatsTaken: number;
  seatsAvailable: number;
  priceCents: number;
  status: EventStatus;
  createdAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  venue: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  status?: 'draft' | 'published';
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  venue?: string;
  startsAt?: string;
  capacity?: number;
  priceCents?: number;
  status?: EventStatus;
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EventStatus;
  venue?: string;
  organizerId?: number;
  startsAfter?: string;
  startsBefore?: string;
  sortBy?: 'startsAt' | 'createdAt' | 'priceCents' | 'capacity' | 'title';
  sortOrder?: 'asc' | 'desc';
}
