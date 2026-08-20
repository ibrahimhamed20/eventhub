import { prisma } from "../../db/prisma.js";
import { ForbiddenError } from "../../shared/errors.js";
import type { JwtPayload } from "../auth/auth.service.js";
import type { Loaders } from "./analytics.loaders.js";

export interface AnalyticsContext {
  actor: JwtPayload;
  loaders: Loaders;
}

/** Shared visibility rule: organizers see only their own data, admins see all. */
function organizerFilter(actor: JwtPayload) {
  return actor.role === "admin" ? {} : { organizerId: actor.userId };
}

export const resolvers = {
  Query: {
    myEvents: async (
      _p: unknown,
      args: { limit?: number },
      ctx: AnalyticsContext,
    ) => {
      return prisma.event.findMany({
        where: organizerFilter(ctx.actor),
        orderBy: { startsAt: "desc" },
        take: args.limit ?? 20,
      });
    },

    eventStats: async (
      _p: unknown,
      args: { id: number },
      ctx: AnalyticsContext,
    ) => {
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

    organizerStats: async (
      _p: unknown,
      _a: unknown,
      ctx: AnalyticsContext,
    ) => {
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

    // Batched via DataLoader (aggregates loader)
    bookingCount: async (
      e: { id: number },
      _a: unknown,
      ctx: AnalyticsContext,
    ) => (await ctx.loaders.aggregates.load(e.id)).bookingCount,

    // Batched via DataLoader (aggregates loader - reuses cached batch from same tick)
    revenueCents: async (
      e: { id: number },
      _a: unknown,
      ctx: AnalyticsContext,
    ) => (await ctx.loaders.aggregates.load(e.id)).revenueCents,

    // Batched via DataLoader (attendees loader) with field-level authorization
    attendees: async (
      e: { id: number; organizerId: number },
      _a: unknown,
      ctx: AnalyticsContext,
    ) => {
      if (ctx.actor.role !== "admin" && e.organizerId !== ctx.actor.userId) {
        throw new ForbiddenError(
          "you can only view attendees for your own events",
        );
      }
      return ctx.loaders.attendees.load(e.id);
    },
  },
};
