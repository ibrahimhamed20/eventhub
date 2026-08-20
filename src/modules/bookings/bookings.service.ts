import { prisma } from "../../db/prisma.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../shared/errors.js";
import type { JwtPayload } from "../auth/auth.service.js";
import type { CreateBookingInput } from "./bookings.schema.js";
import type { Booking } from "../../generated/prisma/client.js";


interface LockedEventRow {
  id: number;
  capacity: number;
  seats_taken: number;
  price_cents: number;
  status: string;
  starts_at: Date;
}

/**
 * Creates a ticket booking atomically using Pessimistic Locking (SELECT ... FOR UPDATE).
 *
 * This prevents the classic Time-Of-Check to Time-Of-Use (TOCTOU) race condition
 * where concurrent booking requests could check capacity simultaneously and oversell seats.
 */
export async function createBooking(
  userId: number,
  input: CreateBookingInput,
): Promise<Booking> {
  const { eventId, seats } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Explicitly acquire an exclusive row lock on the target event.
    // Concurrent transactions trying to read the same event with FOR UPDATE will wait.
    const rows = await tx.$queryRaw<LockedEventRow[]>`
      SELECT id, capacity, seats_taken, price_cents, status, starts_at
      FROM events
      WHERE id = ${eventId}
      FOR UPDATE
    `;

    const event = rows[0];
    if (!event) {
      throw new NotFoundError("event");
    }

    // 2. Business validation rules under the lock
    if (event.status !== "published") {
      throw new ConflictError("cannot book an event that is not published");
    }

    if (new Date(event.starts_at) <= new Date()) {
      throw new ConflictError("cannot book an event that has already started");
    }

    const availableSeats = event.capacity - event.seats_taken;
    if (availableSeats < seats) {
      throw new ConflictError(
        `not enough seats available (${availableSeats} remaining, requested ${seats})`,
        "SOLD_OUT",
      );
    }

    // 3. Compute total price on the server (never trust client calculations)
    const totalCents = seats * event.price_cents;

    // 4. Increment seatsTaken and create the booking atomically
    await tx.event.update({
      where: { id: eventId },
      data: {
        seatsTaken: {
          increment: seats,
        },
      },
    });

    const booking = await tx.booking.create({
      data: {
        eventId,
        userId,
        seats,
        totalCents,
        status: "confirmed",
      },
    });

    return booking;
  });
}

/**
 * Returns all bookings made by the current user.
 */
export async function getUserBookings(userId: number) {
  return prisma.booking.findMany({
    where: { userId },
    include: {
      event: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single booking by ID.
 * Accessible by the booking owner or an admin.
 */
export async function getBookingById(bookingId: number, actor: JwtPayload) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: true,
    },
  });

  if (!booking) {
    throw new NotFoundError("booking");
  }

  if (booking.userId !== actor.userId && actor.role !== "admin") {
    throw new ForbiddenError("you can only view your own bookings");
  }

  return booking;
}

interface LockedBookingRow {
  id: number;
  event_id: number;
  user_id: number;
  seats: number;
  status: string;
}

/**
 * Cancels a booking atomically and returns reserved seats back to the event.
 *
 * Uses pessimistic locking on the booking row (SELECT FOR UPDATE) to guarantee idempotency
 * and prevent double-cancellation race conditions.
 */
export async function cancelBooking(
  bookingId: number,
  actor: JwtPayload,
): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the booking row
    const rows = await tx.$queryRaw<LockedBookingRow[]>`
      SELECT id, event_id, user_id, seats, status
      FROM bookings
      WHERE id = ${bookingId}
      FOR UPDATE
    `;

    const booking = rows[0];
    if (!booking) {
      throw new NotFoundError("booking");
    }

    // 2. Authorization check: owner or admin only
    if (booking.user_id !== actor.userId && actor.role !== "admin") {
      throw new ForbiddenError("you can only cancel your own bookings");
    }

    // 3. Status check under lock: must be confirmed (prevents double-cancel race)
    if (booking.status !== "confirmed") {
      throw new ConflictError("booking is already cancelled");
    }

    // 4. Fetch the event to ensure it has not already started
    const event = await tx.event.findUnique({
      where: { id: booking.event_id },
      select: { startsAt: true },
    });

    if (!event) {
      throw new NotFoundError("event");
    }

    if (new Date(event.startsAt) <= new Date()) {
      throw new ConflictError(
        "cannot cancel a booking for an event that has already started",
      );
    }

    // 5. Atomically decrement seatsTaken on the event and mark the booking as cancelled
    await tx.event.update({
      where: { id: booking.event_id },
      data: {
        seatsTaken: {
          decrement: booking.seats,
        },
      },
    });

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
      },
    });

    return updated;
  });
}

