# Basement One Booking OS — Architecture v0.1

## Product boundary

This is not only a reservation calendar. The core operating flow is:

`Prospect discovery -> Sales CRM -> Quote -> HOLD -> Confirmed booking -> Contract / payment -> Event operation -> Follow-up`

The existing chatbot is an external channel. It is not rebuilt here. It consumes Booking OS APIs for availability, booking creation and later quote/payment/status operations.

## Core modules

### 1. Prospect discovery

`prospects` stores raw venue-sales candidates before they enter CRM. Each record can carry a segment, source URL, evidence, fit score, rationale and dedupe key.

Reason: automated discovery inevitably creates noise. Raw candidates must not pollute the real sales pipeline.

### 2. CRM

`customers`, `customer_contacts`, `leads`, `interactions` form the sales layer.

All inbound and outbound channels are normalized to `interactions`:
- phone
- email
- website
- chatbot
- Kakao
- Instagram / Facebook
- SMS
- meeting
- ads
- internal notes

A lead has one lifecycle status and a `next_action_at` field so future automation can generate the follow-up queue.

### 3. Booking vs. schedule occupancy

`bookings` is the commercial reservation object.

`schedule_blocks` is the physical occupancy object.

They are deliberately separate.

One booking can occupy:
- 1F only
- B1 only
- 1F + B1

and can create several time blocks per space:
- setup
- hold
- booking
- teardown
- internal
- maintenance

This lets the system change customer/contract/payment state without corrupting the actual venue calendar.

## Reservation conflict invariant

A blocking time range overlaps another when:

`existing.starts_at < requested.ends_at AND existing.ends_at > requested.starts_at`

The service layer performs the following in one PostgreSQL transaction:

1. Sort all requested space IDs.
2. Acquire a transaction-scoped advisory lock for every space in that deterministic order.
3. Check overlapping active blocking rows.
4. Reject with `409 schedule_conflict` if any exist.
5. Insert booking, booking-space mapping and schedule blocks atomically.

Sorting prevents deadlocks for multi-space bookings.

`db/hardening.sql` optionally adds a PostgreSQL GiST exclusion constraint as a second line of defense against direct SQL writes.

## HOLD

`bookings.hold_expires_at` is the commercial expiry timestamp.

The primary schedule block is `hold` for `hold` and `tentative` bookings. The next automation phase must expire the booking and mark its blocking rows cancelled when the hold expires, unless it has been extended or confirmed.

## Quote and contract

A booking can have multiple quote versions.

`quotes` stores aggregate amounts and status. `quote_items` stores the line items. Historical quote versions are not overwritten.

Contracts are independent from payment and booking status. A valid state can be:

- booking: `confirmed`
- contract: `signed`
- payment: partially paid

These dimensions must not be collapsed into one status field.

## Payment model

One booking can have multiple `payment_requests`, for example:
- deposit
- interim payment
- balance
- additional charge

Each request can have multiple `payment_transactions`.

Supported modelled methods:
- bank transfer
- virtual account
- online card
- offline card terminal
- cash
- other

Transactions distinguish `charge` and `refund`.

### Payment security invariant

The application must never store card PAN, expiration date, CVC or other raw card credentials. Online card data belongs in the PG-hosted payment flow. Booking OS stores only provider IDs, statuses and amounts.

The initial provider plan is Toss Payments direct integration, while `provider` / `provider_payment_id` remain generic so the PG can be changed later.

## Multi-tenant boundary

The schema starts with `organizations -> venues -> spaces` even though v0.1 operates Basement One only.

Reason: the cost is small now and it preserves the option to turn the system into a multi-venue SaaS later without redesigning the core booking and CRM schema.

## Time and money conventions

- Database timestamps: PostgreSQL `timestamptz`.
- Default venue timezone: `Asia/Seoul`.
- Display/local business rules are interpreted in venue timezone.
- Monetary fields are integer KRW in v0.1; no floating-point currency values.

## External API boundary

v0.1 exposes shared-secret integration routes:

- `GET /api/availability`
- `POST /api/bookings`

Header:

`x-integration-secret: <INTEGRATION_WEBHOOK_SECRET>`

This is sufficient for the existing trusted chatbot/backend integration. Human administrator authentication and RBAC are a separate implementation task.

## Not implemented yet

- real authentication / session / RBAC enforcement
- automated prospect web discovery
- email / Kakao / SNS channel adapters
- live calendar CRUD UI
- HOLD expiry worker
- quote UI and PDF generation
- contract e-sign integration
- Toss Payments API / webhook
- bank auto-reconciliation / virtual accounts
- analytics and attribution dashboards
- production notifications and job queue
