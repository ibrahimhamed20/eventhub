import { prisma } from "../../db/prisma.js";
import { ForbiddenError } from "../../shared/errors.js";
import type { JwtPayload } from "../auth/auth.service.js";

interface Context {
  actor: JwtPayload;
}

/** Shared visibility rule: organizers see only their own data. */
function organizerFilter(actor: JwtPayload) {
  return actor.role === "admin" ? {} : { organizerId: actor.userId };
}

export const naiveResolvers = {
  Query: {
    myEvents: async (_p: unknown, args: { limit?: number }, ctx: Context) => {
      return prisma.event.findMany({
        where: organizerFilter(ctx.actor),
        orderBy: { startsAt: "desc" },
        take: args.limit ?? 20,
      });
    },

    eventStats: async (_p: unknown, args: { id: number }, ctx: Context) => {
      const event = await prisma.event.findUnique({ where: { id: args.id } });
      if (!event) return null;
      if (
        ctx.actor.role !== "admin" &&
        event.organizerId !== ctx.actor.userId
      ) {
        throw new ForbiddenError("you can only view stats for your own events");
      }
      return event;
    },

    organizerStats: async (_p: unknown, _a: unknown, ctx: Context) => {
      const where = organizerFilter(ctx.actor);
      const events = await prisma.event.findMany({ where });
      const eventIds = events.map((e) => e.id);

      const agg = await prisma.booking.aggregate({
        where: { eventId: { in: eventIds }, status: "confirmed" },
        _sum: { totalCents: true },
        _count: { id: true },
      });

      const occupancies = events.map((e) =>
        e.capacity > 0 ? e.seatsTaken / e.capacity : 0,
      );

      return {
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === "published").length,
        totalBookings: agg._count.id,
        totalRevenueCents: agg._sum.totalCents ?? 0,
        averageOccupancy:
          occupancies.length > 0
            ? occupancies.reduce((a, b) => a + b, 0) / occupancies.length
            : 0,
      };
    },
  },

  EventStatsGQL: {
    startsAt: (e: { startsAt: Date }) => e.startsAt.toISOString(),
    seatsAvailable: (e: { capacity: number; seatsTaken: number }) =>
      Math.max(0, e.capacity - e.seatsTaken),
    occupancyRate: (e: { capacity: number; seatsTaken: number }) =>
      e.capacity > 0 ? e.seatsTaken / e.capacity : 0,

    // ⚠️ N+1 #1: runs once PER EVENT
    bookingCount: async (e: { id: number }) => {
      return prisma.booking.count({
        where: { eventId: e.id, status: "confirmed" },
      });
    },

    // ⚠️ N+1 #2: runs once PER EVENT
    revenueCents: async (e: { id: number }) => {
      const agg = await prisma.booking.aggregate({
        where: { eventId: e.id, status: "confirmed" },
        _sum: { totalCents: true },
      });
      return agg._sum.totalCents ?? 0;
    },

    // ⚠️ N+1 #3: runs once PER EVENT
    attendees: async (
      e: { id: number; organizerId: number },
      _args: unknown,
      ctx: Context,
    ) => {
      // Field-level authorization: this field defends itself regardless
      // of which graph path reached it. Root-level checks alone would
      // break the moment a new query returns an Event.
      if (ctx.actor.role !== "admin" && e.organizerId !== ctx.actor.userId) {
        throw new ForbiddenError(
          "you can only view attendees for your own events",
        );
      }
      const bookings = await prisma.booking.findMany({
        where: { eventId: e.id, status: "confirmed" },
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { id: "asc" },
      });
      return bookings.map((b) => ({
        bookingId: b.id,
        fullName: b.user.fullName,
        email: b.user.email,
        seats: b.seats,
        totalCents: b.totalCents,
        bookedAt: b.createdAt.toISOString(),
      }));
    },
  },
};

