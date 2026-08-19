import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { catchAsync } from "../../middleware/core.js";
import {
  requireAuth,
  requireRole,
  optionalAuth,
} from "../../middleware/auth.js";
import {
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
} from "./events.schema.js";
import * as eventsService from "./events.service.js";

export const eventRoutes = Router();

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
