# Vassment One Booking OS

Venue prospecting, sales CRM, booking calendar, customer reservation and payment operations for VASSMENT ONE.

## Current implementation status

### Working application flows

- protected single-admin Booking OS session
- responsive public customer reservation module at `/reserve`
- privacy-safe public availability lookup for 1F / B1
- website inquiry intake -> CRM lead + inquiry booking
- administrator direct booking creation
- website inquiry -> HOLD promotion
- HOLD extension -> confirmed booking -> completed / cancelled lifecycle
- automatic HOLD expiry service + protected job endpoint
- B1 / 1F / B1+1F transactional conflict prevention
- setup / booking / teardown physical occupancy blocks
- manual internal-event / maintenance schedule blocks
- live weekly administrator calendar
- manual payment requests: deposit / interim / balance / additional
- manual receipt/refund transactions: bank transfer / cash / offline card / other
- payment request paid / partially-paid / overdue state recalculation
- trusted integration availability + booking APIs for the existing chatbot/backend

### Core data model already present

- organizations / venues / spaces / members
- prospects / customers / contacts / leads / interactions
- bookings / booking_spaces / schedule_blocks
- quotes / quote_items / contracts
- payment_requests / payment_transactions
- audit_logs

### Still to implement before production launch

- generated/reviewed production DB migrations and provisioning
- multi-user member/RBAC login (current UI intentionally uses one administrator password)
- live prospect finder and review queue
- full CRM list/detail/interaction CRUD
- quote editor, quote customer view and PDF document generation
- contract/e-sign integration
- Toss Payments online card + webhook
- virtual-account reconciliation if required
- public inquiry rate limiting / bot protection at deployment edge
- customer reservation-detail portal after inquiry/HOLD
- email / Kakao / SNS adapters and notification delivery
- operational analytics / attribution
- production monitoring, backup and deployment
- actual insertion into the existing Vassment One website

## Technology baseline

- Node.js 24 LTS
- Next.js 16.3.3
- React / React DOM 19.2.8
- TypeScript 6.0.3
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

Required application secrets are documented in `.env.example`:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `INTEGRATION_WEBHOOK_SECRET`
- `AUTOMATION_SECRET`

Do not commit production secret values.

## Initial Vassment One IDs

The bootstrap file uses stable initial IDs so external integrations can be wired before an admin settings UI exists.

```text
Organization  00000000-0000-0000-0000-000000000001
Venue         00000000-0000-0000-0000-000000000010
1F            00000000-0000-0000-0000-000000000101
B1            00000000-0000-0000-0000-000000000102
```

These are application identifiers, not secrets.

## Customer website module

Public route:

```text
/reserve
```

The module is responsive for PC/mobile and is designed to be mounted inside the existing Vassment One website shell.

Customer flow:

`space -> date/time -> availability -> event information -> contact information -> inquiry reference`

The public UI never returns another customer's identity, internal HOLD details or internal booking data.

### Public availability

```http
GET /api/public/availability?spaces=1F,B1&from=2026-09-12T18:00:00+09:00&to=2026-09-12T23:00:00+09:00
```

Public output only exposes availability booleans.

### Public inquiry

```http
POST /api/public/inquiries
Content-Type: application/json
```

The inquiry creates both a website-source sales lead and an `inquiry` booking. It does not block the venue until an administrator promotes it to HOLD.

## Administrator Booking OS

Administrator routes require an HttpOnly signed session cookie created by `/api/auth/login`.

Current operational screens:

- `/` overview
- `/calendar` live B1 / 1F schedule and manual blocks
- `/bookings` inquiry / HOLD / confirmed booking operations
- `/payments` payment requests, manual receipts and refunds
- `/prospects` model/shell
- `/crm` model/shell

The current initial deployment auth is intentionally a single strong administrator password. The schema already contains members/roles so multi-user RBAC can replace it later.

## HOLD automation

Protected job endpoint:

```http
POST /api/jobs/expire-holds
x-automation-secret: <AUTOMATION_SECRET>
```

The job re-checks each due HOLD while holding booking/space transaction locks, cancels expired bookings and releases their active schedule blocks.

## Trusted integration API

Trusted backend/chatbot calls require:

```text
x-integration-secret: <INTEGRATION_WEBHOOK_SECRET>
```

### Availability with internal conflict details

```http
GET /api/availability?spaceIds=<uuid>,<uuid>&from=2026-09-12T09:00:00+09:00&to=2026-09-12T23:00:00+09:00
```

### Create booking

```http
POST /api/bookings
Content-Type: application/json
x-integration-secret: ...
```

### Booking lifecycle

```http
PATCH /api/bookings/<booking-uuid>
Content-Type: application/json
x-integration-secret: ...
```

Supported actions:

- `confirm`
- `extend_hold`
- `cancel`
- `complete`

## Payment model

Booking status and payment status remain independent.

One booking can have multiple requests:

- deposit
- interim payment
- balance
- additional charge

Each request can have multiple charge/refund transactions.

Current working manual methods:

- bank transfer
- cash
- offline card terminal
- other/manual

Online card remains planned for Toss Payments. Raw card PAN, expiration date and CVC must never be stored by this application.

## Existing chatbot

The chatbot already exists and remains a channel adapter, not a second booking database.

Expected integration path:

`Chatbot -> Availability API -> lead/booking request -> Booking Core -> status/payment APIs`

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

For Codex / coding-agent work, see [`AGENTS.md`](AGENTS.md).
