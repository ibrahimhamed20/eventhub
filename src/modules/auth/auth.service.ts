import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { config } from "../../config/index.js";
import {
  ConflictError,
  UnauthenticatedError,
  NotFoundError,
} from "../../shared/errors.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";
import type { User, UserRole } from "../../generated/prisma/client.js";

export type { UserRole };

export interface JwtPayload {
  userId: number;
  role: UserRole;
}

export interface FormattedUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
}

const BCRYPT_ROUNDS = 12;

/** Strips passwordHash — it must never leave this module. */
export function formatUser(user: User): FormattedUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateAccessToken(user: Pick<User, "id" | "role">): string {
  const payload: JwtPayload = { userId: user.id, role: user.role };
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
}

export async function createRefreshToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  );
  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function register(input: RegisterInput): Promise<{
  user: FormattedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new ConflictError("email already in use");
    }
    throw err;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return { user: formatUser(user), accessToken, refreshToken };
}

export async function login(input: LoginInput): Promise<{
  user: FormattedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new UnauthenticatedError("invalid email or password");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  return { user: formatUser(user), accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const stored = await prisma.refreshToken.findFirst({
    where: { token: refreshToken, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!stored) {
    throw new UnauthenticatedError("invalid or expired refresh token");
  }

  await revokeRefreshToken(refreshToken);

  return {
    accessToken: generateAccessToken(stored.user),
    refreshToken: await createRefreshToken(stored.user.id),
  };
}

export async function logout(refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
}

export async function getUserProfile(userId: number): Promise<FormattedUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("user");
  }
  return formatUser(user);
}
