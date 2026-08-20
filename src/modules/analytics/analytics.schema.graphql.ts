export const typeDefs = `#graphql
  type AttendeeGQL {
    bookingId: Int!
    fullName: String!
    email: String!
    seats: Int!
    totalCents: Int!
    bookedAt: String!
  }

  type EventStatsGQL {
    id: Int!
    title: String!
    venue: String!
    startsAt: String!
    status: String!
    capacity: Int!
    seatsTaken: Int!
    seatsAvailable: Int!
    occupancyRate: Float!
    bookingCount: Int!
    revenueCents: Int!
    attendees: [AttendeeGQL!]!
  }

  type OrganizerStatsGQL {
    totalEvents: Int!
    publishedEvents: Int!
    totalBookings: Int!
    totalRevenueCents: Int!
    averageOccupancy: Float!
  }

  type Query {
    organizerStats: OrganizerStatsGQL!
    myEvents(limit: Int): [EventStatsGQL!]!
    eventStats(id: Int!): EventStatsGQL
  }
`;
