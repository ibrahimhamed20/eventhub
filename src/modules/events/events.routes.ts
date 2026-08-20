import { pipeline } from "node:stream/promises";
import { Router } from "express";

import { validate } from "../../middleware/validate.js";
import { catchAsync } from "../../middleware/core.js";
import {
  requireAuth,
  requireRole,
  optionalAuth,
} from "../../middleware/auth.js";
import {
  eventsListLimiter,
  csvExportLimiter,
} from "../../middleware/rateLimit.js";
import {
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
  listEventsQuerySchema,
  type ListEventsQuery,
} from "./events.schema.js";
import * as eventsService from "./events.service.js";

export const eventRoutes = Router();


/**
 * @openapi
 * /api/v1/events:
 *   get:
 *     summary: List and discover events
 *     description: Public endpoint with optional authentication. General visitors only see published events. Admins can see all events or filter by status.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (maximum 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search matching title, description, or venue (case-insensitive)
 *       - in: query
 *         name: venue
 *         schema:
 *           type: string
 *         description: Filter events by venue name (case-insensitive substring)
 *       - in: query
 *         name: organizerId
 *         schema:
 *           type: integer
 *         description: Filter events by organizer ID
 *       - in: query
 *         name: startsAfter
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events starting at or after this date
 *       - in: query
 *         name: startsBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events starting at or before this date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled]
 *         description: Filter by status (Admins only for draft or all statuses)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [startsAt, createdAt, priceCents, capacity, title]
 *           default: startsAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Paginated list of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded (too many requests)
 */
eventRoutes.get(
  "/",
  eventsListLimiter,
  optionalAuth,
  validate(listEventsQuerySchema, "query"),
  catchAsync(async (req, res) => {
    const result = await eventsService.listEvents(
      req.query as unknown as ListEventsQuery,
      req.user,
    );
    res.json(result);
  }),
);


/**
 * @openapi
 * /api/v1/events:
 *   post:
 *     summary: Create a new event
 *     description: Organizers or admins can create events. The organizerId is automatically extracted from the JWT token.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, venue, startsAt, capacity, priceCents]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Node.js Architecture Conference
 *               description:
 *                 type: string
 *                 example: Deep dive into scalable systems with Node.js
 *               venue:
 *                 type: string
 *                 example: Grand Hall, Cairo
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 example: '2026-10-15T18:00:00.000Z'
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 250
 *               priceCents:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1500
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 default: published
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (only organizer or admin)
 */
eventRoutes.post(
  "/",
  requireAuth,
  requireRole("organizer", "admin"),
  validate(createEventSchema, "body"),
  catchAsync(async (req, res) => {
    const event = await eventsService.createEvent(req.user!.userId, req.body);
    res.status(201).json({ event });
  }),
);

/**
 * @openapi
 * /api/v1/events/mine:
 *   get:
 *     summary: Get all events created by the logged-in organizer
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizer's events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 */
eventRoutes.get(
  "/mine",
  requireAuth,
  requireRole("organizer", "admin"),
  catchAsync(async (req, res) => {
    const events = await eventsService.getOrganizerEvents(req.user!.userId);
    res.json({ events });
  }),
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   get:
 *     summary: Get an event by ID
 *     description: Public endpoint. Draft events are only visible to their creator or an admin.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 */
eventRoutes.get(
  "/:id",
  optionalAuth,
  validate(eventIdParamSchema, "params"),
  catchAsync(async (req, res) => {
    const event = await eventsService.getEventById(
      Number(req.params.id),
      req.user,
    );
    res.json({ event });
  }),
);

/**
 * @openapi
 * /api/v1/events/{id}/attendees.csv:
 *   get:
 *     summary: Export confirmed event attendees as CSV
 *     description: Streams confirmed attendee bookings for an event as CSV with formula injection protection. Only the event creator or an admin can export attendees.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: CSV stream of confirmed attendees
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "bookingId,attendeeName,attendeeEmail,seats,totalCents,bookedAt\n1,\"John Doe\",\"john@example.com\",2,5000,\"2026-11-20T18:00:00.000Z\"\n"
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (not the event owner or admin)
 *       404:
 *         description: Event not found
 *       429:
 *         description: Rate limit exceeded (too many export requests)
 */
eventRoutes.get(
  "/:id/attendees.csv",
  requireAuth,
  requireRole("organizer", "admin"),
  csvExportLimiter,
  validate(eventIdParamSchema, "params"),
  catchAsync(async (req, res) => {
    const eventId = Number(req.params.id);
    const stream = await eventsService.getEventAttendeesCsvStream(
      eventId,
      req.user!,
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="event-${eventId}-attendees.csv"`,
    );

    await pipeline(stream, res);
  }),
);


/**
 * @openapi
 * /api/v1/events/{id}:
 *   patch:
 *     summary: Update an event
 *     description: Only the organizer who created the event or an admin can update it.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               venue: { type: string }
 *               startsAt: { type: string, format: date-time }
 *               capacity: { type: integer, minimum: 1 }
 *               priceCents: { type: integer, minimum: 0 }
 *               status: { type: string, enum: [draft, published, cancelled] }
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Validation error or capacity below existing bookings
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (not the event owner)
 *       404:
 *         description: Event not found
 */
eventRoutes.patch(
  "/:id",
  requireAuth,
  requireRole("organizer", "admin"),
  validate(eventIdParamSchema, "params"),
  validate(updateEventSchema, "body"),
  catchAsync(async (req, res) => {
    const event = await eventsService.updateEvent(
      Number(req.params.id),
      req.user!,
      req.body,
    );
    res.json({ event });
  }),
);

/**
 * @openapi
 * /api/v1/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     description: Only the event creator or an admin can delete it. Rejects with 409 Conflict if there are existing bookings.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Event deleted successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (not the event owner)
 *       404:
 *         description: Event not found
 *       409:
 *         description: Conflict (event has existing bookings)
 */
eventRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("organizer", "admin"),
  validate(eventIdParamSchema, "params"),
  catchAsync(async (req, res) => {
    await eventsService.deleteEvent(Number(req.params.id), req.user!);
    res.status(204).send();
  }),
);
