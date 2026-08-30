# Vassment One Booking OS

Venue prospecting, sales CRM, booking calendar, customer reservation, quote/contract and payment operations for VASSMENT ONE.

## Current implementation status

### Working application flows

- protected single-admin Booking OS session
- responsive public customer reservation module at `/reserve`
- privacy-safe public availability lookup for 1F / B1
- website inquiry -> CRM lead + inquiry booking
- administrator direct booking creation
- inquiry -> HOLD promotion
- HOLD extension -> confirmed -> completed / cancelled lifecycle
- automatic HOLD expiry service + protected job endpoint
- B1 / 1F / B1+1F transaction-level conflict prevention
- setup / booking / teardown physical occupancy blocks
- manual internal-event / maintenance blocks
- live weekly administrator calendar
- raw prospect ingest / dedupe / review / CRM conversion
- CRM lead status + phone/email/Kakao/SNS/note interaction capture
- versioned quote editor + customer-visible sent quote + customer acceptance
- contract status + external e-sign document URL management
- signed/expiring customer reservation portal
- deposit / interim / balance / additional payment requests
- bank transfer / cash / offline card manual ledger
- online Toss Payments card flow using server-calculated outstanding amount
- Toss success confirmation with server-side amount/order validation and idempotency
- Toss partial/full card refund flow
- Toss `PAYMENT_STATUS_CHANGED` webhook reconciliation via provider re-query
- payment request paid / partially-paid / overdue state recalculation
- trusted integration availability + booking APIs for the existing chatbot/backend
- `/api/health` deployment readiness endpoint

### Core data model

- organizations / venues / spaces / members
- prospects / customers / contacts / leads / interactions
- bookings / booking_spaces / schedule_blocks
- quotes / quote_items / contracts
- payment_requests / payment_transactions
- audit_logs

## CI / integration validation

The pull-request CI uses a real PostgreSQL 17 service and validates:

1. dependency installation
2. ESLint
3. Next.js production build + TypeScript
4. Drizzle migration SQL generation
5. schema application to PostgreSQL
6. Vassment One bootstrap data
7. PostgreSQL GiST booking-conflict hardening
8. booking overlap prevention
9. HOLD -> confirmed lifecycle
10. manual partial receipt/refund
11. prospect dedupe + CRM conversion
12. HOLD auto-expiry
13. Toss card intent + mocked official confirm protocol
14. Toss partial refund + mocked official cancel protocol
15. Toss webhook provider re-query + idempotent reconciliation

No real Toss key or real payment is used in CI.

## Remaining before production launch

- move to a PRIVATE operational repository before adding live data/secrets
- provision production PostgreSQL
- generate, review and retain production migration files
- production backup/restore setup and restore drill
- deploy application to an HTTPS production domain
- actual insertion of `/reserve` into the current Vassment One website
- actual existing-chatbot API connection
- actual Toss test-key sandbox E2E, webhook registration, then live-key transition
- edge rate limiting / bot protection for admin login and public inquiry
- actual prospect discovery provider
- email / Kakao / SNS adapters
- external e-sign provider API automation if required
- multi-user RBAC if additional operators are added
- production monitoring / alerting
- operational analytics / attribution dashboard

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the production release gate.

## Technology baseline

- Node.js 24 LTS
- Next.js 16.3.3
- React / React DOM 19.2.8
- TypeScript 6.0.3
- PostgreSQL 17 compatible
- Drizzle ORM 0.45.2
- Zod 4.5.4

## Local setup

```bash
cp .env.example .env.local
npm install
npm run db:generate
npm run db:migrate
psql "$DATABASE_URL" -f db/bootstrap.sql
psql "$DATABASE_URL" -f db/hardening.sql
npm run dev
```

Do not use `db:push --force` against production. Production schema changes must use reviewed migrations.

## Required secrets / configuration

See `.env.example`.

```text
DATABASE_URL
APP_URL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
CUSTOMER_PORTAL_SECRET
INTEGRATION_WEBHOOK_SECRET
AUTOMATION_SECRET
TOSS_CLIENT_KEY
TOSS_SECRET_KEY
```

Never commit production values.

## Initial Vassment One IDs

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

Designed for insertion into the existing Vassment One website on both PC and mobile.

Customer flow:

`space -> date/time -> availability -> event information -> contact information -> inquiry`

The public availability endpoint never returns another customer's identity, HOLD owner or internal booking details.

## Customer reservation portal

Signed route:

```text
/reservation/<booking-id>?token=<signed-token>
```

The portal can show:

- reservation status
- HOLD expiration
- latest customer-visible quote
- quote acceptance
- customer-visible contract link/status
- payment requests and paid/outstanding amounts
- online card payment button when Toss is configured

The portal token is signed and expiring. It is not sent to Toss success/fail URLs.

## Administrator Booking OS

Current operational areas:

- `/` overview
- `/calendar`
- `/bookings`
- `/payments`
- `/prospects`
- `/crm`
- booking quote/contract detail screens

Current auth is intentionally a single strong administrator password. The data model already contains members/roles for future multi-user RBAC.

## HOLD automation

```http
POST /api/jobs/expire-holds
x-automation-secret: <AUTOMATION_SECRET>
```

The job re-checks due HOLDs under transaction locks, cancels expired bookings and releases active schedule blocks.

## Trusted integration API

Existing chatbot/backend requests use:

```text
x-integration-secret: <INTEGRATION_WEBHOOK_SECRET>
```

Main endpoints:

```text
GET   /api/availability
POST  /api/bookings
PATCH /api/bookings/<booking-id>
```

The existing chatbot remains a channel adapter. Booking OS remains the Source of Truth.

## Toss Payments

Customer card flow:

`payment request -> server-created pending intent -> Toss V2 checkout -> success redirect -> server confirm -> internal ledger`

Key invariants:

- payable amount is computed from the server ledger
- browser-returned orderId/amount must match the stored intent
- confirm/cancel POST requests use stable idempotency keys
- raw PAN/CVC/card expiry is never stored
- successful refunds are written only after Toss cancellation succeeds
- `PAYMENT_STATUS_CHANGED` webhook is verified by re-querying Toss with `paymentKey`
- repeated webhooks only reconcile the missing delta and do not duplicate refunds

Webhook route:

```text
POST /api/webhooks/toss
```

Register `PAYMENT_STATUS_CHANGED` in the Toss developer console before production.

## Health

```text
GET /api/health
```

Returns HTTP 200 only when the DB is reachable and required production secrets are configured. Otherwise it returns 503.

## Architecture / deployment

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`AGENTS.md`](AGENTS.md)
