import type { Migration } from '../migrate.js';

const migration: Migration = {
  name: '002_create_events_and_bookings',
  async up(client) {
    await client.query(`
      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        venue TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        capacity INTEGER NOT NULL CHECK (capacity >= 0),
        seats_taken INTEGER NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

        -- The database itself refuses to let bookings exceed capacity.
        -- Even if application logic has a bug, this constraint holds.
        CONSTRAINT seats_within_capacity CHECK (seats_taken <= capacity)
      );

      CREATE INDEX idx_events_starts_at ON events(starts_at);
      CREATE INDEX idx_events_organizer ON events(organizer_id);

      CREATE TABLE bookings (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seats INTEGER NOT NULL CHECK (seats > 0),
        total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX idx_bookings_event ON bookings(event_id);
      CREATE INDEX idx_bookings_user ON bookings(user_id);
    `);
  },
  async down(client) {
    await client.query(`DROP TABLE bookings; DROP TABLE events;`);
  },
};

export default migration;
