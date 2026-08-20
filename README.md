# EventHub 🎟️

> Enterprise-grade event discovery, ticketing, and organizer analytics platform with strict concurrency controls, resilient token lifecycle, and modern standalone Angular frontend.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Angular 22 (Frontend)   │
                          │ Standalone · SignalStore  │
                          │   PrimeNG · Tailwind CSS  │
                          └─────────────┬─────────────┘
                                        │
                         HTTP REST      │  GraphQL Queries
                   (/api/v1/auth,       │   (/graphql)
                   events, bookings)    │
                                        ▼
                          ┌───────────────────────────┐
                          │    Express 5 (Backend)    │
                          │  TypeScript · ESM · Zod   │
                          │ Apollo Server 5 · RateLim │
                          └─────────────┬─────────────┘
                                        │
                                        │ Prisma ORM / raw SQL
                                        │ (SELECT FOR UPDATE)
                                        ▼
                          ┌───────────────────────────┐
                          │    PostgreSQL Database    │
                          │  Pessimistic Row Locking  │
                          │     CHECK Constraints     │
                          └───────────────────────────┘
```

---

## Key Highlights

- **Anti-Overselling Concurrency Protection**: Ticket booking and cancellation use atomic transactions with PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) and database `CHECK` constraints to mathematically eliminate race conditions under high load.
- **Resilient Token Lifecycle**: In-memory access token storage, rotated refresh tokens, and a synchronized single-flight HTTP interceptor queue that prevents token-rotation stampedes.
- **Dual API Architecture**: Fast RESTful endpoints for CRUD/transactions + GraphQL with DataLoader batching for high-performance N+1-free organizer analytics.
- **Modern Standalone Angular Frontend**: 100% standalone Angular 22 application with NgRx SignalStore, reactive forms with server validation error mapping, live seat availability meters, and streaming CSV downloads.

---

## Tech Stack

### Frontend (`frontend/`)
- **Framework**: Angular 22 (Standalone components, Zoneless-compatible, native `@if`/`@for` control flow)
- **State Management**: `@ngrx/signals` (NgRx SignalStore for auth and global session state)
- **UI Components & Styling**: PrimeNG 19/20 (Aura preset), Tailwind CSS v4, PrimeIcons
- **Forms & Validation**: Typed Reactive Forms (`FormGroup<{...}>`) with Zod-parity client validation
- **HTTP Client**: Functional interceptors (`withInterceptors`), single-flight 401 refresh queue

### Backend (`src/`)
- **Runtime**: Node.js >= 20, TypeScript 5+ (Strict ESM)
- **Web Framework**: Express 5 with centralized error handling and Zod validation middleware
- **Database & ORM**: PostgreSQL with Prisma ORM 7 + raw SQL pessimistic locking
- **GraphQL**: Apollo Server 5 with DataLoader per-request batching
- **Security & Rate Limiting**: `express-rate-limit`, `helmet`, `cors`, `bcrypt` (12 rounds), JWT auth
- **Documentation**: Swagger UI (`/docs`) & generated OpenAPI 3.0 spec (`/openapi.json`)

---

## Quick Start

### 1. Prerequisites
- **Node.js** >= 20
- **PostgreSQL** running locally or via Docker

### 2. Start PostgreSQL (Docker)
```bash
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=eventhub \
  -e POSTGRES_PASSWORD=eventhub \
  -e POSTGRES_DB=eventhub \
  --name eventhub-pg postgres:16
```

### 3. Backend Setup
```bash
# In the root repository directory
npm install
cp .env.example .env

# Generate Prisma Client & apply schema migrations
npx prisma generate
npx prisma db push

# Start backend dev server (port 3000)
npm run dev
```

### 4. Frontend Setup
```bash
# In a new terminal window
cd frontend
npm install --legacy-peer-deps

# Start frontend dev server (port 4200)
npm start
```

- **Frontend App**: `http://localhost:4200`
- **Backend API**: `http://localhost:3000`
- **Interactive Swagger Docs**: `http://localhost:3000/docs`
- **GraphQL Sandbox**: `http://localhost:3000/graphql`

---

## API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register attendee or organizer | 3 / hour / IP |
| `POST` | `/api/v1/auth/login` | Authenticate & receive token pair | 5 failed / 15 min / email+IP |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token & get fresh access token | Standard |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token | Standard |
| `GET` | `/api/v1/auth/me` | Get authenticated user profile | Standard |

### Events (`/api/v1/events`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/events` | Optional | Public discovery with search, venue filter, date range, and pagination |
| `GET` | `/api/v1/events/:id` | Optional | Event details + live seats availability (drafts visible to owner only) |
| `POST` | `/api/v1/events` | Organizer / Admin | Create new event (startsAt must be in future) |
| `GET` | `/api/v1/events/mine` | Organizer / Admin | List organizer's own events |
| `PATCH` | `/api/v1/events/:id` | Organizer / Admin | Update event details (`capacity >= seatsTaken` enforced) |
| `DELETE` | `/api/v1/events/:id` | Organizer / Admin | Delete event (rejected with 409 if confirmed bookings exist) |
| `GET` | `/api/v1/events/:id/attendees.csv` | Organizer / Admin | Authenticated streaming CSV export with formula injection protection |

### Bookings (`/api/v1/bookings`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/bookings` | Required | Reserve seats atomically with `SELECT ... FOR UPDATE` row locking |
| `GET` | `/api/v1/bookings/mine` | Required | Retrieve list of authenticated user's bookings |
| `GET` | `/api/v1/bookings/:id` | Required | Get single booking details (owner or admin) |
| `PATCH` | `/api/v1/bookings/:id/cancel` | Required | Cancel booking & release seats back to pool (blocked if event started) |

### GraphQL Analytics (`/graphql`)
Requires `Authorization: Bearer <token>` header (organizer/admin):
- `organizerStats`: Overall metrics (`totalEvents`, `publishedEvents`, `totalBookings`, `totalRevenueCents`, `averageOccupancy`)
- `myEvents(limit: Int)`: List of organizer events with aggregated booking counts, revenues, and occupancy rates (batched via DataLoader)
- `eventStats(id: Int!)`: Detailed event analytics including attendee breakdown

---

## Directory Layout

```
eventhub/
├── prisma/
│   └── schema.prisma           # Prisma domain schema & relations
├── src/
│   ├── app.ts                  # Express assembly, middleware order & routes
│   ├── server.ts               # Server bootstrap, port binding, graceful shutdown
│   ├── config/                 # Environment validation and typed configuration
│   ├── db/                     # Prisma client singleton & query counter
│   ├── middleware/             # Auth, role guard, rateLimiters, error handling, Zod validate
│   ├── modules/
│   │   ├── auth/               # Register, login, token rotation, bcrypt, JWT
│   │   ├── events/             # Events CRUD, list discovery, streaming CSV
│   │   ├── bookings/           # Concurrency-locked booking and cancellation
│   │   └── analytics/          # GraphQL schema, resolvers, DataLoader batching
│   └── shared/                 # Centralized AppError classes and ErrorCodes
├── frontend/                   # Angular 22 Web Application (see frontend/README.md)
│   ├── src/app/core/           # Auth store, interceptor queue, API clients, models
│   ├── src/app/features/       # Events, Bookings, Auth, Organizer modules
│   └── src/app/shared/         # Layout components, occupancy bar, rate limit banner
└── README.md
```

---

## Implemented Feature Roadmap

- [x] **#1 Auth Module**: JWT access/refresh token rotation, bcrypt hashing, RBAC.
- [x] **#2 Events CRUD**: Resource-level ownership checks, future date validation, capacity reduction guard.
- [x] **#3 Event Discovery**: Debounced search, venue & date filtering, server-driven pagination.
- [x] **#4 Concurrency-Safe Bookings**: Pessimistic row locking (`SELECT FOR UPDATE`), anti-overselling guarantee.
- [x] **#5 Booking Management**: Optimistic cancellation, seat return to pool, past-event cancellation blocking.
- [x] **#6 Streaming CSV Export**: Chunked cursor stream with formula injection sanitization.
- [x] **#7 Granular Rate Limiting**: Multi-tiered rate limiters with `RateLimit-Reset` header feedback.
- [x] **#8 GraphQL Analytics**: Apollo Server 5 integration with DataLoader N+1 query elimination.
- [x] **#9 Angular 22 Frontend**: Full standalone UI with NgRx SignalStore, PrimeNG, and Tailwind CSS.
