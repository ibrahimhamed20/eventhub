import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { catchAsync } from "../../middleware/core.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
} from "../../middleware/rateLimit.js";
import { registerSchema, loginSchema, refreshSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

export const authRoutes = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [attendee, organizer]
 *                 default: attendee
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already in use
 *       429:
 *         description: Rate limit exceeded (too many registrations)
 */
authRoutes.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  catchAsync(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Rate limit exceeded (too many failed attempts)
 */
authRoutes.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  validate(loginSchema),
  catchAsync(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  }),
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid or expired refresh token
 */
authRoutes.post(
  "/refresh",
  validate(refreshSchema),
  catchAsync(async (req, res) => {
    const result = await authService.refreshTokens(req.body.refreshToken);
    res.status(200).json(result);
  }),
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out user and invalidate refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
authRoutes.post(
  "/logout",
  catchAsync(async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    await authService.logout(refreshToken);
    res.status(200).json({ message: "logged out successfully" });
  }),
);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
authRoutes.get(
  "/me",
  requireAuth,
  catchAsync(async (req, res) => {
    const user = await authService.getUserProfile(req.user!.userId);
    res.status(200).json({ user });
  }),
);

export default authRoutes;
