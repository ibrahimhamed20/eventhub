import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { pool } from "../../db/pool.js";
import { config } from "../../config/index.js";
import {
  AppError,
  ConflictError,
  UnauthenticatedError,
  NotFoundError,
} from "../../shared/errors.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

export type UserRole = "attendee" | "organizer" | "admin";

export interface JwtPayload {
  userId: number;
  role: UserRole;
}

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  created_at: Date;
}

export interface FormattedUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
}

const BCRYPT_ROUNDS = 12;

export function formatUser(record: UserRecord): FormattedUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    role: record.role,
    createdAt: record.created_at,
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

export function generateAccessToken(
  user: Pick<UserRecord, "id" | "role">,
): string {
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
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt],
  );
  return token;
}

export async function findValidRefreshToken(
  token: string,
): Promise<{ user_id: number } | null> {
  const { rows } = await pool.query<{ user_id: number }>(
    "SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > now()",
    [token],
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
}

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const { rows } = await pool.query<UserRecord>(
    "SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE email = $1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number): Promise<UserRecord | null> {
  const { rows } = await pool.query<UserRecord>(
    "SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function register(input: RegisterInput): Promise<{
  user: FormattedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const passwordHash = await hashPassword(input.password);

  let user: UserRecord;
  try {
    const { rows } = await pool.query<UserRecord>(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, password_hash, full_name, role, created_at`,
      [input.email, passwordHash, input.fullName, input.role],
    );

    const inserted = rows[0];
    if (!inserted) {
      throw new AppError("failed to create user", 500, "INTERNAL");
    }
    user = inserted;
  } catch (err) {
    // 23505 = Postgres unique_violation — the email UNIQUE constraint
    // is the single source of truth here, so no TOCTOU race is possible.
    if ((err as { code?: string }).code === "23505") {
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
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new UnauthenticatedError("invalid email or password");
  }

  const isValid = await verifyPassword(input.password, user.password_hash);
  if (!isValid) {
    throw new UnauthenticatedError("invalid email or password");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: formatUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenRecord = await findValidRefreshToken(refreshToken);
  if (!tokenRecord) {
    throw new UnauthenticatedError("invalid or expired refresh token");
  }

  const user = await findUserById(tokenRecord.user_id);
  if (!user) {
    throw new UnauthenticatedError("user not found");
  }

  // Revoke old refresh token (rotate refresh token for security)
  await revokeRefreshToken(refreshToken);

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = await createRefreshToken(user.id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken?: string): Promise<void> {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
}

export async function getUserProfile(userId: number): Promise<FormattedUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError("user");
  }

  return formatUser(user);
}
