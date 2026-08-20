import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { catchAsync } from "../../middleware/core.js";
import { requireAuth } from "../../middleware/auth.js";
import { createBookingSchema } from "./bookings.schema.js";
import * as bookingsService from "./bookings.service.js";

export const bookingRoutes = Router();

/**
 * @openapi
 * /api/v1/bookings:
 *   post:
 *     summary: Book tickets for an event
 *     description: Authenticated users can book seats for a published event. Uses pessimistic locking (SELECT FOR UPDATE) to prevent overselling under concurrent requests.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, seats]
 *             properties:
 *               eventId:
 *                 type: integer
 *                 example: 1
 *               seats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       404:
 *         description: Event not found
 *       409:
 *         description: Conflict (event not published, event already started, or sold out)
 */
bookingRoutes.post(
  "/",
  requireAuth,
  validate(createBookingSchema, "body"),
  catchAsync(async (req, res) => {
    const booking = await bookingsService.createBooking(
      req.user!.userId,
      req.body,
    );
    res.status(201).json({ booking });
  }),
);

/**
 * @openapi
 * /api/v1/bookings/mine:
 *   get:
 *     summary: Get all bookings for the logged-in user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings with event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Booking'
 *                       - type: object
 *                         properties:
 *                           event:
 *                             $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthenticated
 */
bookingRoutes.get(
  "/mine",
  requireAuth,
  catchAsync(async (req, res) => {
    const bookings = await bookingsService.getUserBookings(req.user!.userId);
    res.json({ bookings });
  }),
);
