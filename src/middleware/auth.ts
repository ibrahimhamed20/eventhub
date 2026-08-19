import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  verifyAccessToken,
  type JwtPayload,
  type UserRole,
} from "../modules/auth/auth.service.js";
import { UnauthenticatedError, ForbiddenError } from "../shared/errors.js";

// Augments Express's Request type so `req.user` is properly typed
// everywhere, instead of `any` or manual casts in every handler.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new UnauthenticatedError("missing or malformed Authorization header"));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthenticatedError("invalid or expired token"));
  }
}

export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthenticatedError());
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

/** Attaches req.user if a valid token is present, but never rejects.
 *  Useful for endpoints that behave differently for logged-in users
 *  without requiring login. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme === "Bearer" && token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // ignore — this is the "optional" part
    }
  }
  next();
}
