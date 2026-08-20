import { Readable } from "node:stream";
import { prisma } from "../../db/prisma.js";

import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../shared/errors.js";
import type { JwtPayload } from "../auth/auth.service.js";
import type {
  CreateEventInput,
  UpdateEventInput,
  ListEventsQuery,
} from "./events.schema.js";
import type { Event, Prisma } from "../../generated/prisma/client.js";

function withSeatsAvailable(event: Event) {
  return {
    ...event,
    seatsAvailable: Math.max(0, event.capacity - event.seatsTaken),
  };
}

function assertCanManage(
  event: Event,
  actor: JwtPayload,
  action: string,
): void {
  if (event.organizerId !== actor.userId && actor.role !== "admin") {
    throw new ForbiddenError(`you can only ${action} your own events`);
  }
}

export async function createEvent(
  organizerId: number,
  input: CreateEventInput,
) {
  const event = await prisma.event.create({
    data: {
      organizerId,
      title: input.title,
      description: input.description ?? null,
      venue: input.venue,
      startsAt: input.startsAt,
      capacity: input.capacity,
      priceCents: input.priceCents,
      status: input.status,
    },
  });
  return withSeatsAvailable(event);
}

/**
 * Draft events return 404 (not 403) for non-owners — a 403 would
 * confirm the event exists, which leaks information.
 */
export async function getEventById(id: number, actor?: JwtPayload) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new NotFoundError("event");

  if (event.status === "draft") {
    const isOwner = actor?.userId === event.organizerId;
    const isAdmin = actor?.role === "admin";
    if (!isOwner && !isAdmin) throw new NotFoundError("event");
  }

  return withSeatsAvailable(event);
}

export async function updateEvent(
  id: number,
  actor: JwtPayload,
  input: UpdateEventInput,
) {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new NotFoundError("event");

  assertCanManage(event, actor, "edit");

  if (input.capacity !== undefined && input.capacity < event.seatsTaken) {
    throw new ValidationError(
      `capacity (${input.capacity}) cannot be less than seats already booked (${event.seatsTaken})`,
    );
  }

  const updated = await prisma.event.update({ where: { id }, data: input });
  return withSeatsAvailable(updated);
}

export async function deleteEvent(
  id: number,
  actor: JwtPayload,
): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new NotFoundError("event");

  assertCanManage(event, actor, "delete");

  const confirmedCount = await prisma.booking.count({
    where: { eventId: id, status: "confirmed" },
  });
  if (confirmedCount > 0) {
    throw new ConflictError(
      "cannot delete an event with confirmed bookings; cancel it instead",
    );
  }

  await prisma.event.delete({ where: { id } });
}

export async function getOrganizerEvents(organizerId: number) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    orderBy: { startsAt: "asc" },
  });
  return events.map(withSeatsAvailable);
}

export async function listEvents(query: ListEventsQuery, actor?: JwtPayload) {
  const conditions: Prisma.EventWhereInput[] = [];

  // --- visibility ---
  if (actor?.role === "admin") {
    if (query.status) conditions.push({ status: query.status });
  } else if (actor?.role === "organizer") {
    conditions.push({
      OR: [
        { status: "published" },
        { status: "draft", organizerId: actor.userId },
      ],
    });
  } else {
    conditions.push({ status: "published" });
  }

  // --- filters ---
  if (query.venue)
    conditions.push({ venue: { contains: query.venue, mode: "insensitive" } });
  if (query.organizerId) conditions.push({ organizerId: query.organizerId });

  if (query.startsAfter || query.startsBefore) {
    conditions.push({
      startsAt: {
        ...(query.startsAfter ? { gte: query.startsAfter } : {}),
        ...(query.startsBefore ? { lte: query.startsBefore } : {}),
      },
    });
  }

  // --- search: its own OR group, safely ANDed with the rest ---
  if (query.search) {
    conditions.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { venue: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.EventWhereInput = { AND: conditions };

  const { page, limit, sortBy, sortOrder } = query;
  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: events.map(withSeatsAvailable),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Escapes a value safely for CSV export.
 * Neutralizes spreadsheet formula injection (=, +, -, @, \t, \r) by prepending a single quote,
 * and wraps all values in standard double quotes escaping internal quotes.
 */
function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Streams confirmed attendees for an event as CSV rows using cursor-based pagination.
 * Only the event organizer or an admin can access this stream.
 */
export async function getEventAttendeesCsvStream(
  eventId: number,
  actor: JwtPayload,
): Promise<Readable> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new NotFoundError("event");
  }

  assertCanManage(event, actor, "export attendees for");

  async function* generateCsvRows() {
    yield "bookingId,attendeeName,attendeeEmail,seats,totalCents,bookedAt\n";

    let cursor: number | undefined;
    const BATCH_SIZE = 500;

    while (true) {
      const batch = await prisma.booking.findMany({
        where: { eventId, status: "confirmed" },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) {
        break;
      }

      for (const b of batch) {
        const row = [
          csvEscape(b.id),
          csvEscape(b.user.fullName),
          csvEscape(b.user.email),
          csvEscape(b.seats),
          csvEscape(b.totalCents),
          csvEscape(b.createdAt.toISOString()),
        ].join(",") + "\n";

        yield row;
      }

      cursor = batch[batch.length - 1]!.id;
      if (batch.length < BATCH_SIZE) {
        break;
      }
    }
  }

  return Readable.from(generateCsvRows());
}

