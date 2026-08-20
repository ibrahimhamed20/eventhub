import { rateLimit, ipKeyGenerator } from "express-rate-limit";

/**
 * Production Note:
 * express-rate-limit uses an in-memory store by default (MemoryStore).
 * In a multi-instance or clustered production environment (e.g. PM2 cluster, Kubernetes pods),
 * each instance maintains its own separate counters.
 * For production deployments with multiple instances, configure a shared Redis store:
 *
 * import RedisStore from "rate-limit-redis";
 * import { redisClient } from "../db/redis.js";
 *
 * store: new RedisStore({
 *   sendCommand: (...args: string[]) => redisClient.sendCommand(args),
 * }),
 */

/**
 * Layer 1: Strict limiter per IP + Email compound key (5 failed attempts per 15 min).
 * Prevents brute-force password guessing against a specific account from a given IP,
 * without locking out coworkers sharing the same NAT IP.
 */
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip!)}:${req.body?.email ?? "unknown"}`,
  message: {
    error: {
      message:
        "too many login attempts for this account, please try again later",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Layer 2: Looser limiter per IP only (50 requests per 15 min).
 * Catches distributed password spraying across many different emails from the same IP,
 * while being generous enough for users behind shared NAT gateways.
 */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "too many login attempts from this IP, please try again later",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Strict limiter for user registration: 3 account creations per hour per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "too many accounts created from this IP, please try again later",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Moderate limiter for booking creation: 10 booking requests per minute.
 */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "too many booking requests, please slow down",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Generous limiter for public event discovery: 100 requests per minute.
 */
export const eventsListLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "too many requests, please slow down",
      code: "RATE_LIMITED",
    },
  },
});

/**
 * Strict limiter for heavy CSV streaming exports: 5 exports per minute.
 */
export const csvExportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "too many export requests, please wait before exporting again",
      code: "RATE_LIMITED",
    },
  },
});
