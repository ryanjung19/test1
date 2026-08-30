# Agent instructions — Basement One Booking OS

Read `README.md` and `docs/ARCHITECTURE.md` before changing code.

## Non-negotiable invariants

1. Do not merge `bookings` and `schedule_blocks`. Commercial reservation state and physical occupancy are separate domains.
2. Do not remove the per-space transactional locking from booking creation unless it is replaced by an equal or stronger concurrency guarantee.
3. Multi-space lock acquisition must use deterministic sorted order.
4. Do not store raw card PAN, CVC, expiration date or other card credentials.
5. Money is integer KRW unless a future explicit multi-currency migration is approved.
6. Store timestamps as timezone-aware timestamps. Basement One business time is `Asia/Seoul`.
7. Keep `organization_id` tenant boundaries intact. The current venue is Basement One but the core must remain multi-venue capable.
8. Do not overwrite historical quotes or successful payment transactions. Use new versions / compensating refund transactions.
9. External integrations must go through explicit adapters/API boundaries. Do not couple chatbot, Kakao, email or a PG SDK directly into domain tables.
10. Do not mark placeholder UI as implemented functionality. README status must match reality.

## Development rules

- Prefer small domain services over large route handlers.
- Validate every external payload.
- Mutation endpoints must be authenticated/authorized before production use.
- Booking and payment writes should be transactional.
- Add or update tests when changing booking conflict logic, payment aggregation or status transitions.
- Database migrations must be reviewed for destructive changes.
- Never commit secrets or production credentials.

## Current priorities

1. Make v0.1 build and migrate cleanly.
2. Add live database-backed calendar and booking CRUD UI.
3. Add HOLD expiry automation.
4. Connect existing chatbot to availability and booking APIs.
5. Add CRM prospect/lead conversion and interaction capture.
6. Add Toss Payments only after booking/quote/payment core flows are stable.
