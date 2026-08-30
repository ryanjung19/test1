# Vassment One Booking OS — Roadmap

## P0. Foundation — current branch

- [x] Product/domain boundary
- [x] Next.js application shell
- [x] Multi-venue capable PostgreSQL schema
- [x] Prospect / CRM domain model
- [x] Booking vs schedule-block separation
- [x] B1 + 1F multi-space booking model
- [x] Transactional conflict prevention
- [x] Availability API
- [x] Booking creation API
- [x] Quote / contract schema
- [x] Multi-payment schema
- [x] Existing chatbot integration boundary
- [x] CI lint/build pipeline

## P1. Booking operations — highest priority

1. Select and provision the production PostgreSQL environment.
2. Generate/review migrations and apply bootstrap/hardening SQL.
3. Add administrator authentication and organization/role authorization.
4. Build database-backed calendar views for B1 / 1F.
5. Build booking create/edit/cancel flows.
6. Implement HOLD extension / confirmation / cancellation transitions.
7. Implement automatic HOLD expiry and schedule release.
8. Add manual internal / maintenance blocks.
9. Add booking detail activity timeline and audit log writes.

Exit condition: staff can operate the full reservation calendar without spreadsheets or a second calendar database.

## P2. Quote and manual payment operations

1. Quote editor with version history.
2. Deposit / interim / balance / additional payment requests.
3. Manual bank-transfer confirmation.
4. Cash payment registration.
5. Offline card-terminal approval registration.
6. Partial payment / refund transaction handling.
7. Outstanding balance calculation and due-date queue.

Exit condition: every confirmed booking has an accurate commercial balance without needing a separate payment ledger.

## P3. CRM and prospecting

1. Prospect review queue by segment.
2. Prospect -> CRM lead conversion.
3. Customer / contact deduplication.
4. Phone / email / Kakao / SNS interaction capture.
5. Next-action queue.
6. Inbound website and chatbot lead creation.
7. Outbound campaign lists and result tracking.
8. Automated candidate discovery connectors after manual review rules are stable.

Exit condition: every inbound/outbound sales action is attributable to a lead and eventual booking/revenue outcome.

## P4. Existing chatbot integration

The chatbot already exists. Do not rebuild it.

Connect it to:

1. availability lookup
2. inquiry / lead creation
3. HOLD / booking request
4. quote/status lookup
5. payment-link retrieval

The chatbot remains a channel. Booking OS remains the source of truth.

## P5. Online payment

1. Toss Payments sandbox integration.
2. Online card payment request.
3. Webhook idempotency.
4. Payment success/failure reconciliation.
5. Partial/full cancellation and refund.
6. Virtual account if bank-transfer volume justifies it.
7. ARS card payment only if telephone payment demand is material.

Do not store raw card credentials.

## P6. Automation and analytics

- HOLD expiry reminders
- quote follow-up reminders
- unpaid balance reminders
- event-day preparation checklist
- post-event follow-up / repeat-sales tasks
- lead-source conversion rate
- quote-to-booking conversion
- venue utilization by space/time
- channel-attributed revenue
- repeat customer revenue
- average lead-to-booking time

## Codex usage rule

Use Codex only when the task benefits from repository-scale execution, for example:

- dependency installation / lockfile generation and repeated build fixes
- large migration generation/review cycles
- broad multi-file refactors
- automated integration-test expansion
- repetitive adapter implementation across several channels

Product decisions, schema decisions, workflow design and small focused changes remain controlled from the main ChatGPT development thread.
