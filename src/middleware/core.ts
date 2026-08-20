import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../shared/errors.js';
import { isProduction } from '../config/index.js';

/**
 * Express 5 forwards rejected async handlers automatically, but
 * this wrapper is kept for explicitness and for parity with the
 * Express 4 codebases you'll inevitably touch.
 */
export function catchAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`);
  });
  next();
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { message: 'route not found', code: 'NOT_FOUND', path: req.originalUrl },
  });
}

/**
 * Centralized error handler — Express identifies this by its
 * 4-parameter arity, so `next` must stay even though it's unused.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Headers already flushed (e.g. mid-stream) — we cannot change the
  // status code or send a JSON body. Let Express destroy the socket.
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: {
      message: isProduction ? "internal server error" : err.message,
      code: "INTERNAL",
    },
  });
}

