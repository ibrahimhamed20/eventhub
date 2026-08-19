import { pool } from "../../db/pool.js";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "../../shared/errors.js";
import type { JwtPayload, UserRole } from "../auth/auth.service.js";
import type {
  CreateEventInput,
  UpdateEventInput,
  ListEventsQuery,
} from "./events.schema.js";

export interface EventRecord {
  id: number;
  organizer_id: number;
  title: string;
  description: string | null;
  venue: string;
  starts_at: Date;
  capacity: number;
  seats_taken: number;
  price_cents: number;
  status: "draft" | "published" | "cancelled";
  created_at: Date;
}

export interface FormattedEvent {
  id: number;
  organizerId: number;
  title: string;
  description: string | null;
  venue: string;
  startsAt: Date;
  capacity: number;
  seatsTaken: number;
  seatsAvailable: number;
  priceCents: number;
  status: "draft" | "published" | "cancelled";
  createdAt: Date;
}

export function formatEvent(record: EventRecord): FormattedEvent {
  return {
    id: record.id,
    organizerId: record.organizer_id,
    title: record.title,
    description: record.description,
    venue: record.venue,
    startsAt: record.starts_at,
    capacity: record.capacity,
    seatsTaken: record.seats_taken,
    seatsAvailable: Math.max(0, record.capacity - record.seats_taken),
    priceCents: record.price_cents,
    status: record.status,
    createdAt: record.created_at,
  };
}

export async function findEventRecordById(
  id: number,
): Promise<EventRecord | null> {
  const { rows } = await pool.query<EventRecord>(
    `SELECT id, organizer_id, title, description, venue, starts_at, capacity, seats_taken, price_cents, status, created_at
     FROM events WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Creates a new event owned by the authenticated organizer/admin.
 */
export async function createEvent(
  organizerId: number,
  input: CreateEventInput,
): Promise<FormattedEvent> {
  const { rows } = await pool.query<EventRecord>(
    `INSERT INTO events (organizer_id, title, description, venue, starts_at, capacity, price_cents, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, organizer_id, title, description, venue, starts_at, capacity, seats_taken, price_cents, status, created_at`,
    [
      organizerId,
      input.title,
      input.description ?? null,
      input.venue,
      input.startsAt,
      input.capacity,
      input.priceCents,
      input.status,
    ],
  );

  const inserted = rows[0];
  if (!inserted) {
    throw new AppError("failed to create event", 500, "INTERNAL");
  }

  return formatEvent(inserted);
}

/**
 * Fetches an event by ID.
 * If status is 'draft', only the organizer or an admin can access it.
 */
export async function getEventById(
  id: number,
  currentUser?: JwtPayload,
): Promise<FormattedEvent> {
  const event = await findEventRecordById(id);
  if (!event) {
    throw new NotFoundError("event");
  }

  if (event.status === "draft") {
    const isOwner = currentUser && currentUser.userId === event.organizer_id;
    const isAdmin = currentUser && currentUser.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new NotFoundError("event");
    }
  }

  return formatEvent(event);
}

/**
 * Partially updates an event with ownership and capacity checks.
 */
export async function updateEvent(
  id: number,
  userId: number,
  userRole: UserRole,
  input: UpdateEventInput,
): Promise<FormattedEvent> {
  const event = await findEventRecordById(id);
  if (!event) {
    throw new NotFoundError("event");
  }

  // Ownership check
  if (event.organizer_id !== userId && userRole !== "admin") {
    throw new ForbiddenError("you can only edit your own events");
  }

  // Capacity validation
  if (input.capacity !== undefined && input.capacity < event.seats_taken) {
    throw new ValidationError(
      `capacity (${input.capacity}) cannot be less than seats already booked (${event.seats_taken})`,
    );
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (input.title !== undefined) {
    setClauses.push(`title = $${paramIdx++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIdx++}`);
    values.push(input.description);
  }
  if (input.venue !== undefined) {
    setClauses.push(`venue = $${paramIdx++}`);
    values.push(input.venue);
  }
  if (input.startsAt !== undefined) {
    setClauses.push(`starts_at = $${paramIdx++}`);
    values.push(input.startsAt);
  }
  if (input.capacity !== undefined) {
    setClauses.push(`capacity = $${paramIdx++}`);
    values.push(input.capacity);
  }
  if (input.priceCents !== undefined) {
    setClauses.push(`price_cents = $${paramIdx++}`);
    values.push(input.priceCents);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(input.status);
  }

  if (setClauses.length === 0) {
    return formatEvent(event);
  }

  values.push(id);
  const query = `
    UPDATE events
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIdx}
    RETURNING id, organizer_id, title, description, venue, starts_at, capacity, seats_taken, price_cents, status, created_at
  `;

  const { rows } = await pool.query<EventRecord>(query, values);
  const updated = rows[0];
  if (!updated) {
    throw new NotFoundError("event");
  }

  return formatEvent(updated);
}

/**
 * Deletes an event. If bookings already exist, throws 409 ConflictError.
 */
export async function deleteEvent(
  id: number,
  userId: number,
  userRole: UserRole,
): Promise<void> {
  const event = await findEventRecordById(id);
  if (!event) {
    throw new NotFoundError("event");
  }

  // Ownership check
  if (event.organizer_id !== userId && userRole !== "admin") {
    throw new ForbiddenError("you can only delete your own events");
  }

  // Conflict check: if bookings exist, cannot delete
  if (event.seats_taken > 0) {
    throw new ConflictError(
      "cannot delete an event with existing bookings; cancel it instead",
      "CONFLICT",
    );
  }

  await pool.query("DELETE FROM events WHERE id = $1", [id]);
}

/**
 * Retrieves all events created by the logged-in organizer.
 */
export async function getOrganizerEvents(
  organizerId: number,
): Promise<FormattedEvent[]> {
  const { rows } = await pool.query<EventRecord>(
    `SELECT id, organizer_id, title, description, venue, starts_at, capacity, seats_taken, price_cents, status, created_at
     FROM events
     WHERE organizer_id = $1
     ORDER BY starts_at ASC`,
    [organizerId],
  );

  return rows.map(formatEvent);
}

/**
 * Lists public events with filters, search, sorting, and pagination.
 */
export async function listEvents(
  query: ListEventsQuery,
  currentUser?: JwtPayload,
): Promise<{
  data: FormattedEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (query.status) {
    if (query.status === "draft") {
      // Drafts can only be viewed if requester is the organizer or admin
      if (
        !currentUser ||
        (query.organizerId !== currentUser.userId &&
          currentUser.role !== "admin")
      ) {
        conditions.push(`status = 'published'`);
      } else {
        conditions.push(`status = $${paramIdx++}`);
        values.push(query.status);
      }
    } else {
      conditions.push(`status = $${paramIdx++}`);
      values.push(query.status);
    }
  } else {
    // Default public view only shows published events
    const isAdmin = currentUser?.role === "admin";
    if (!isAdmin) {
      conditions.push(`status = 'published'`);
    }
  }

  if (query.organizerId) {
    conditions.push(`organizer_id = $${paramIdx++}`);
    values.push(query.organizerId);
  }

  if (query.venue) {
    conditions.push(`venue ILIKE $${paramIdx++}`);
    values.push(`%${query.venue}%`);
  }

  if (query.search) {
    conditions.push(
      `(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR venue ILIKE $${paramIdx})`,
    );
    values.push(`%${query.search}%`);
    paramIdx++;
  }

  if (query.startsAfter) {
    conditions.push(`starts_at >= $${paramIdx++}`);
    values.push(query.startsAfter);
  }

  if (query.startsBefore) {
    conditions.push(`starts_at <= $${paramIdx++}`);
    values.push(query.startsBefore);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM events ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

  const sortColumnMap: Record<string, string> = {
    startsAt: "starts_at",
    createdAt: "created_at",
    priceCents: "price_cents",
    capacity: "capacity",
    title: "title",
  };
  const sortCol = sortColumnMap[query.sortBy] ?? "starts_at";
  const sortDir = query.sortOrder === "desc" ? "DESC" : "ASC";

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];
  const dataQuery = `
    SELECT id, organizer_id, title, description, venue, starts_at, capacity, seats_taken, price_cents, status, created_at
    FROM events
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const { rows } = await pool.query<EventRecord>(dataQuery, dataValues);

  return {
    data: rows.map(formatEvent),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
