import DataLoader from "dataloader";
import { prisma } from "../../db/prisma.js";

export interface EventAggregate {
  bookingCount: number;
  revenueCents: number;
}

export interface AttendeeRow {
  bookingId: number;
  fullName: string;
  email: string;
  seats: number;
  totalCents: number;
  bookedAt: string;
}

/**
 * Batches booking aggregates for many events into ONE groupBy query.
 * Replaces two per-event queries (count + sum) with a single call.
 */
export function createAggregateLoader() {
  return new DataLoader<number, EventAggregate>(async (eventIds) => {
    const grouped = await prisma.booking.groupBy({
      by: ["eventId"],
      where: { eventId: { in: [...eventIds] }, status: "confirmed" },
      _sum: { totalCents: true },
      _count: { id: true },
    });

    const map = new Map<number, EventAggregate>(
      grouped.map((g) => [
        g.eventId,
        { bookingCount: g._count.id, revenueCents: g._sum.totalCents ?? 0 },
      ]),
    );

    // DataLoader requires results in the SAME ORDER as the input keys.
    // Events with zero bookings won't appear in groupBy — default them.
    return eventIds.map(
      (id) => map.get(id) ?? { bookingCount: 0, revenueCents: 0 },
    );
  });
}

/**
 * Batches attendee lists for many events into ONE query.
 */
export function createAttendeesLoader() {
  return new DataLoader<number, AttendeeRow[]>(async (eventIds) => {
    const bookings = await prisma.booking.findMany({
      where: { eventId: { in: [...eventIds] }, status: "confirmed" },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { id: "asc" },
    });

    const map = new Map<number, AttendeeRow[]>();
    eventIds.forEach((id) => map.set(id, []));
    for (const b of bookings) {
      map.get(b.eventId)!.push({
        bookingId: b.id,
        fullName: b.user.fullName,
        email: b.user.email,
        seats: b.seats,
        totalCents: b.totalCents,
        bookedAt: b.createdAt.toISOString(),
      });
    }
    return eventIds.map((id) => map.get(id) ?? []);
  });
}

export interface Loaders {
  aggregates: ReturnType<typeof createAggregateLoader>;
  attendees: ReturnType<typeof createAttendeesLoader>;
}

/**
 * ⚠️ Must be called PER REQUEST, never shared globally —
 * DataLoader caches results, and a shared instance would leak
 * one user's data into another user's request.
 */
export function createLoaders(): Loaders {
  return {
    aggregates: createAggregateLoader(),
    attendees: createAttendeesLoader(),
  };
}
