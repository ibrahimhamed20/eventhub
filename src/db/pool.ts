import { Pool, PoolClient } from "pg";
import { config } from "../config/index.js";

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: config.db.poolMax,
  connectionTimeoutMillis: 5000,
});

/**
 * Runs a function inside a transaction, using a single dedicated
 * client from the pool. Commits on success, rolls back on any
 * throw, and ALWAYS releases the client back to the pool.
 *
 * This is the pattern that matters for EventHub's core problem:
 * booking a ticket must decrement capacity AND create the booking
 * atomically — never one without the other.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
