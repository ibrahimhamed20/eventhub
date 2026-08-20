import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../shared/errors.js";

type Target = "body" | "query" | "params";

/**
 * Validates and REPLACES the request part with the parsed result,
 * so downstream handlers get properly typed, coerced values
 * (e.g. "5" from a query string becomes the number 5).
 */
export function validate(
  schema: ZodType,
  target: Target = "body",
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(
        new ValidationError("request validation failed", result.error.issues),
      );
      return;
    }
    if (target === "body") {
      req.body = result.data;
    } else {
      // req.query and req.params are getter-only in Express 5,
      // so we redefine rather than assign.
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }
    next();
  };
}
