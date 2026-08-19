import { z } from "zod";

/**
 * Schema for creating a new event (POST /api/v1/events)
 */
export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "title cannot be empty"),
    description: z.string().trim().optional(),
    venue: z.string().trim().min(1, "venue cannot be empty"),
    startsAt: z.coerce.date().refine((d) => d > new Date(), {
      message: "startsAt must be in the future",
    }),
    capacity: z
      .number()
      .int("capacity must be an integer")
      .positive("capacity must be a positive integer"),
    priceCents: z
      .number()
      .int("priceCents must be an integer")
      .min(0, "priceCents must be greater than or equal to 0"),
    status: z.enum(["draft", "published"]).default("published"),
  })
  .strict();

/**
 * Schema for partially updating an existing event (PATCH /api/v1/events/:id)
 * All fields are optional.
 */
export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1, "title cannot be empty").optional(),
    description: z.string().trim().nullable().optional(),
    venue: z.string().trim().min(1, "venue cannot be empty").optional(),
    startsAt: z.coerce
      .date()
      .refine((d) => d > new Date(), {
        message: "startsAt must be in the future",
      })
      .optional(),
    capacity: z
      .number()
      .int("capacity must be an integer")
      .positive("capacity must be a positive integer")
      .optional(),
    priceCents: z
      .number()
      .int("priceCents must be an integer")
      .min(0, "priceCents must be greater than or equal to 0")
      .optional(),
    status: z.enum(["draft", "published", "cancelled"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field must be provided for update",
  });

/**
 * Schema for route params containing :id (e.g. /api/v1/events/:id)
 * Coerces string parameter into a positive integer.
 */
export const eventIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("event ID must be an integer")
    .positive("event ID must be a positive integer"),
});

/**
 * Schema for listing events with pagination, sorting, and filters (GET /api/v1/events)
 */
export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "limit cannot exceed 100")
    .default(10),
  search: z.string().trim().min(1).optional(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  venue: z.string().trim().min(1).optional(),
  organizerId: z.coerce.number().int().positive().optional(),
  startsAfter: z.coerce.date().optional(),
  startsBefore: z.coerce.date().optional(),
  sortBy: z
    .enum(["startsAt", "createdAt", "priceCents", "capacity", "title"])
    .default("startsAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
