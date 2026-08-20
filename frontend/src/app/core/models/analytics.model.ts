export interface AttendeeGQL {
  bookingId: number;
  fullName: string;
  email: string;
  seats: number;
  totalCents: number;
  bookedAt: string;
}

export interface EventStatsGQL {
  id: number;
  title: string;
  venue: string;
  startsAt: string;
  status: string;
  capacity: number;
  seatsTaken: number;
  seatsAvailable: number;
  occupancyRate: number;
  bookingCount: number;
  revenueCents: number;
  attendees?: AttendeeGQL[];
}

export interface OrganizerStatsGQL {
  totalEvents: number;
  publishedEvents: number;
  totalBookings: number;
  totalRevenueCents: number;
  averageOccupancy: number;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: unknown[]; path?: (string | number)[] }>;
}
