import type { Migration } from '../migrate.js';

const migration: Migration = {
  name: '001_create_users',
  async up(client) {
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('attendee', 'organizer', 'admin')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);
  },
  async down(client) {
    await client.query(`DROP TABLE refresh_tokens; DROP TABLE users;`);
  },
};

export default migration;
