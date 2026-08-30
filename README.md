# Vassment One Booking OS

Venue prospecting, sales CRM, booking calendar and payment operations for VASSMENT ONE.

## v0.1 status

### Implemented core

- Next.js application shell and module navigation
- PostgreSQL / Drizzle domain schema
- Vassment One tenant, venue and B1 / 1F bootstrap SQL
- prospect discovery data model
- customer / contact / sales lead / interaction CRM model
- booking + multi-space mapping
- physical schedule blocks for HOLD / booking / setup / teardown / internal / maintenance
- transactional multi-space booking conflict engine
- availability API for trusted external integrations
- booking creation API for trusted external integrations
- quote version / quote item model
- contract status model
- multi-request / multi-transaction payment model
- audit log model
- optional PostgreSQL schedule overlap hardening

### UI skeleton only

- Prospects
- CRM
- Calendar
- Bookings
- Payments

These pages currently describe and expose the module structure. They are not yet live CRUD screens.

### Not implemented yet

- human admin authentication / RBAC enforcement
- database migration files generated from the schema
- live prospect finder
- outbound email / Kakao / SNS automation
- inbound channel adapters
- calendar drag/drop CRUD
- HOLD expiry worker
- live quote editor and document generation
- contract signing integration
- Toss Payments API / webhook
- virtual account reconciliation
- production analytics

## Technology baseline

- Node.js 24 LTS
- Next.js 16.3.3
- React / React DOM 19.2.8
- PostgreSQL
- Drizzle ORM 0.45.2
- Zod 4.5.4

The package versions are intentionally pinned for the initial baseline.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run db:generate
npm run db:migrate
psql "$DATABASE_URL" -f db/bootstrap.sql
```

Recommended database hardening after migrations:

```bash
psql "$DATABASE_URL" -f db/hardening.sql
```

Then:

```bash
npm run dev
```

## Initial Vassment One IDs

The bootstrap file uses stable initial IDs so external integrations can be wired before an admin settings UI exists.

```text
Organization  00000000-0000-0000-0000-000000000001
Venue         00000000-0000-0000-0000-000000000010
1F            00000000-0000-0000-0000-000000000101
B1            00000000-0000-0000-0000-000000000102
```

These are application identifiers, not secrets.

## Integration API

All current external API calls require:

```text
x-integration-secret: <INTEGRATION_WEBHOOK_SECRET>
```

### Availability

```http
GET /api/availability?spaceIds=<uuid>,<uuid>&from=2026-09-12T09:00:00+09:00&to=2026-09-12T23:00:00+09:00
```

Response:

```json
{
  "available": true,
  "conflicts": []
}
```

### Create booking

```http
POST /api/bookings
Content-Type: application/json
x-integration-secret: ...
```

Example HOLD request:

```json
{
  "organizationId": "00000000-0000-0000-0000-000000000001",
  "venueId": "00000000-0000-0000-0000-000000000010",
  "title": "Brand A Launch Event",
  "status": "hold",
  "spaceIds": [
    "00000000-0000-0000-0000-000000000101",
    "00000000-0000-0000-0000-000000000102"
  ],
  "eventStartsAt": "2026-09-12T18:00:00+09:00",
  "eventEndsAt": "2026-09-12T23:00:00+09:00",
  "setupMinutes": 180,
  "teardownMinutes": 60,
  "holdExpiresAt": "2026-09-02T18:00:00+09:00"
}
```

If any requested space overlaps a blocking schedule range, the API returns HTTP `409` with `schedule_conflict` and the conflicting blocks.

## Payment direction

The core treats payment as independent from booking state.

One booking can have:
- deposit
- interim payment
- balance
- additional charge
- one or more charge / refund transactions

Initial operational methods:
- bank transfer: manual confirmation
- cash: manual registration
- offline card: terminal approval record
- online card: Toss Payments planned

Raw card data must never be stored by this application.

## Existing chatbot

The chatbot already exists and should remain a channel adapter, not a second booking database.

Expected integration path:

`Chatbot -> Availability API -> lead/booking request -> Booking Core -> status/payment APIs`

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

For Codex / coding-agent work, see [`AGENTS.md`](AGENTS.md).
