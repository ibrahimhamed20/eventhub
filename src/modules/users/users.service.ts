import { prisma } from "../../db/prisma.js";
import {
  NotFoundError,
  ForbiddenError,
} from "../../shared/errors.js";
import { formatUser, type FormattedUser, type JwtPayload } from "../auth/auth.service.js";
import type { ListUsersQuery, UpdateUserRoleInput } from "./users.schema.js";
import type { Prisma } from "../../generated/prisma/client.js";

export async function listUsers(query: ListUsersQuery) {
  const conditions: Prisma.UserWhereInput[] = [];

  if (query.role) {
    conditions.push({ role: query.role });
  }

  if (query.search) {
    conditions.push({
      OR: [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.UserWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const { page, limit, sortBy, sortOrder } = query;
  const [total, users, roleCounts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),
  ]);

  const summary = {
    total: 0,
    attendees: 0,
    organizers: 0,
    admins: 0,
  };

  for (const group of roleCounts) {
    summary.total += group._count.id;
    if (group.role === "attendee") summary.attendees = group._count.id;
    if (group.role === "organizer") summary.organizers = group._count.id;
    if (group.role === "admin") summary.admins = group._count.id;
  }

  return {
    data: users.map(formatUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  };
}

export async function getUserById(id: number, actor: JwtPayload): Promise<FormattedUser> {
  if (actor.role !== "admin" && actor.userId !== id) {
    throw new ForbiddenError("you can only view your own user profile");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("user");
  }

  return formatUser(user);
}

export async function updateUserRole(
  id: number,
  input: UpdateUserRoleInput,
  actor: JwtPayload
): Promise<FormattedUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("user");
  }

  // Prevent self-demotion from admin
  if (actor.userId === id && input.role !== "admin") {
    throw new ForbiddenError("admins cannot demote their own account");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: input.role },
  });

  return formatUser(updated);
}

export async function deleteUser(id: number, actor: JwtPayload): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("user");
  }

  // Prevent self-deletion
  if (actor.userId === id) {
    throw new ForbiddenError("you cannot delete your own account via admin management");
  }

  await prisma.user.delete({ where: { id } });
}
