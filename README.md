# EventHub

An event booking platform, built to apply Phases 0–7 of the Node.js roadmap in one coherent, modern codebase.

**Stack:** TypeScript (strict, ESM) · Express 5 · PostgreSQL (raw `pg`) · JWT auth · Zod validation · Swagger/OpenAPI

---

## Why this domain

Limited-capacity ticketing forces problems you can't hand-wave:

- **Concurrency.** Two seats left, three simultaneous bookings — who wins? Requires real transactions and row-level locking (`SELECT ... FOR UPDATE`).
- **Integrity.** The `seats_within_capacity` CHECK constraint means the database *itself* refuses to overbook, even if application logic has a bug.
- **Authorization nuance.** An organizer may edit their own events but not someone else's — that's resource-level ownership, a step beyond simple role checks.

---

## Setup

```bash
nvm use
npm install
cp .env.example .env      # adjust PG_* values if needed

# Start Postgres (Docker)
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=eventhub \
  -e POSTGRES_PASSWORD=eventhub \
  -e POSTGRES_DB=eventhub \
  --name eventhub-pg postgres:16

npm run migrate           # apply schema
npm run dev               # start with hot reload
```

Then open **http://localhost:3000/docs** for interactive API documentation.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run typecheck` | Type-check without emitting |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:down` | Roll back the most recent migration |

---

## Structure

```
src/
  config/          typed env config, validated at startup
  db/
    pool.ts        connection pool + withTransaction() helper
    migrate.ts     versioned migration runner (up/down)
    migrations/    numbered migration files
  middleware/
    core.ts        catchAsync, requestLogger, 404, error handler
    auth.ts        requireAuth, requireRole, optionalAuth
    validate.ts    Zod validation middleware factory
  modules/         feature modules (auth, events, bookings, users)
  shared/          errors and cross-cutting types
  docs/            Swagger/OpenAPI config
  app.ts           app assembly — middleware order lives here
  server.ts        entry point, startup checks, graceful shutdown
```

**Module convention** — each feature folder contains:
- `*.service.ts` — business logic and database access
- `*.routes.ts` — Express router + Swagger JSDoc annotations
- `*.schema.ts` — Zod schemas for validation

---

## Roadmap phase coverage

| Phase | Where it shows up |
|---|---|
| 0 — Foundations | `config/`, npm scripts, `.nvmrc`, ESM + TypeScript setup |
| 1 — Core modules | CSV attendee export via streams; `EventEmitter` for domain events |
| 2 — Async patterns | `withTransaction`, custom error classes, graceful shutdown |
| 3 — Express | Middleware ordering, routers, centralized error handling |
| 4 — Databases | Migrations, transactions, row-level locking, connection pooling |
| 5 — REST | Cursor pagination, filtering, status codes, versioning, rate limiting |
| 6 — Auth | JWT access/refresh, bcrypt, RBAC, resource-level ownership checks |
| 7 — GraphQL | Organizer analytics API with DataLoader batching |

---

## Ticket backlog

Foundation is complete (this scaffold). Features are built ticket by ticket:

- [ ] **#1 Auth** — register, login, refresh, logout, `/me`
- [ ] **#2 Events CRUD** — organizer-scoped, with ownership checks
- [ ] **#3 Event discovery** — public listing, cursor pagination, filtering
- [ ] **#4 Booking** — the concurrency-critical one: transaction + `SELECT ... FOR UPDATE`
- [ ] **#5 Booking management** — cancel, restore capacity, view own bookings
- [ ] **#6 Attendee CSV export** — streams, backpressure
- [ ] **#7 Rate limiting** — protect booking and auth endpoints
- [ ] **#8 GraphQL analytics** — organizer dashboards, N+1 + DataLoader
