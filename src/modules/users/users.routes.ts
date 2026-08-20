import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { catchAsync } from "../../middleware/core.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserRoleSchema,
  type ListUsersQuery,
} from "./users.schema.js";
import * as usersService from "./users.service.js";

export const userRoutes = Router();

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: List and search users with role filters
 *     description: Admin-only endpoint for managing system accounts.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [attendee, organizer, admin]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, fullName, email, role]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated list of users and role breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     attendees: { type: integer }
 *                     organizers: { type: integer }
 *                     admins: { type: integer }
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (Admin only)
 */
userRoutes.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validate(listUsersQuerySchema, "query"),
  catchAsync(async (req, res) => {
    const result = await usersService.listUsers(
      req.query as unknown as ListUsersQuery
    );
    res.json(result);
  })
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Users]
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
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRoutes.get(
  "/:id",
  requireAuth,
  validate(userIdParamSchema, "params"),
  catchAsync(async (req, res) => {
    const user = await usersService.getUserById(
      Number(req.params.id),
      req.user!
    );
    res.json({ user });
  })
);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Update a user's role
 *     description: Admin-only endpoint for promoting or demoting accounts.
 *     tags: [Users]
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [attendee, organizer, admin]
 *     responses:
 *       200:
 *         description: User role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRoutes.patch(
  "/:id/role",
  requireAuth,
  requireRole("admin"),
  validate(userIdParamSchema, "params"),
  validate(updateUserRoleSchema, "body"),
  catchAsync(async (req, res) => {
    const user = await usersService.updateUserRole(
      Number(req.params.id),
      req.body,
      req.user!
    );
    res.json({ user });
  })
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user account
 *     description: Admin-only endpoint to remove user accounts and cascade delete their tokens/events.
 *     tags: [Users]
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
 *         description: User deleted successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden (Admin only, cannot delete self)
 *       404:
 *         description: User not found
 */
userRoutes.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validate(userIdParamSchema, "params"),
  catchAsync(async (req, res) => {
    await usersService.deleteUser(Number(req.params.id), req.user!);
    res.status(204).send();
  })
);

export default userRoutes;
