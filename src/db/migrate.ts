import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type pg from 'pg';
import { pool, closePool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export interface Migration {
  name: string;
  up(client: pg.PoolClient): Promise<void>;
  down(client: pg.PoolClient): Promise<void>;
}

async function loadMigrations(): Promise<Migration[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
    .sort();

  const migrations: Migration[] = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(MIGRATIONS_DIR, file)).href);
    migrations.push(mod.default as Migration);
  }
  return migrations;
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));
  const migrations = await loadMigrations();

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`  ⏭️  ${migration.name} — already applied`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await migration.up(client);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
      await client.query('COMMIT');
      console.log(`  ✅ ${migration.name} — applied`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ❌ ${migration.name} — FAILED:`, (err as Error).message);
      throw err;
    } finally {
      client.release();
    }
  }
}

export async function rollbackLast(): Promise<void> {
  await ensureMigrationsTable();
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1'
  );
  const last = rows[0];
  if (!last) {
    console.log('  nothing to roll back');
    return;
  }

  const migrations = await loadMigrations();
  const migration = migrations.find((m) => m.name === last.name);
  if (!migration) throw new Error(`Migration file for "${last.name}" not found on disk`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migration.down(client);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [last.name]);
    await client.query('COMMIT');
    console.log(`  ↩️  ${last.name} — rolled back`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// CLI entry point
const command = process.argv[2];
if (command === 'up' || command === 'down') {
  const action = command === 'up' ? runMigrations : rollbackLast;
  action()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      closePool().finally(() => process.exit(1));
    });
}
