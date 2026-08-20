import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { pool } from "./pool.js";

/**
 * A single shared PrismaClient for the whole app.
 *
 * In Prisma 7 with SQL providers (PostgreSQL), driver adapters are required.
 * We use @prisma/adapter-pg backed by our shared pg.Pool to keep pool management unified.
 */
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [{ emit: "event", level: "query" }, "warn", "error"],
});


export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
