import { Event } from './event.model';

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: number;
  eventId: number;
  userId: number;
  seats: number;
  totalCents: number;
  status: BookingStatus;
  createdAt: string;
  event?: Event;
}

export interface CreateBookingRequest {
  eventId: number;
  seats: number;
}
