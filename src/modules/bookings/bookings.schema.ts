import { z } from "zod";

/**
 * Schema for creating a new booking (POST /api/v1/bookings)
 */
export const createBookingSchema = z
  .object({
    eventId: z
      .number()
      .int("eventId must be an integer")
      .positive("eventId must be a positive integer"),
    seats: z
      .number()
      .int("seats must be an integer")
      .positive("seats must be a positive integer"),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
