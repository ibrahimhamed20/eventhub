import { prisma } from "../../db/prisma.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../shared/errors.js";
import type { JwtPayload } from "../auth/auth.service.js";
import type { CreateEventInput, UpdateEventInput } from "./events.schema.js";
import type { Event } from "../../generated/prisma/client.js";

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
