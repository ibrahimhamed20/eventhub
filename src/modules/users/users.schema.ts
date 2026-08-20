import { z } from "zod";

/**
 * Schema for listing users with pagination, filtering, and sorting
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "limit cannot exceed 100")
    .default(10),
  search: z.string().trim().min(1).optional(),
  role: z.enum(["attendee", "organizer", "admin"]).optional(),
  sortBy: z
    .enum(["createdAt", "fullName", "email", "role"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schema for route params containing :id
 */
export const userIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("user ID must be an integer")
    .positive("user ID must be a positive integer"),
});

/**
 * Schema for updating a user's role (Admin only)
 */
export const updateUserRoleSchema = z
  .object({
    role: z.enum(["attendee", "organizer", "admin"]),
  })
  .strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
