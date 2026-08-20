import { prisma } from "../../db/prisma.js";
import { NotFoundError, ConflictError } from "../../shared/errors.js";
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
