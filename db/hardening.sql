-- Optional but strongly recommended PostgreSQL hardening.
-- The application already serializes booking writes per space with an advisory
-- transaction lock. This adds a database-level invariant so direct SQL writes
-- cannot create overlapping blocking time ranges either.

create extension if not exists btree_gist;

alter table schedule_blocks
  drop constraint if exists schedule_blocks_valid_time_range;

alter table schedule_blocks
  add constraint schedule_blocks_valid_time_range
  check (starts_at < ends_at);

alter table schedule_blocks
  drop constraint if exists schedule_blocks_no_overlap;

alter table schedule_blocks
  add constraint schedule_blocks_no_overlap
  exclude using gist (
    space_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (is_blocking = true and cancelled_at is null);

alter table bookings
  drop constraint if exists bookings_valid_event_time_range;

alter table bookings
  add constraint bookings_valid_event_time_range
  check (
    event_starts_at is null
    or event_ends_at is null
    or event_starts_at < event_ends_at
  );

alter table payment_requests
  drop constraint if exists payment_requests_positive_amount;

alter table payment_requests
  add constraint payment_requests_positive_amount
  check (amount > 0);

alter table payment_transactions
  drop constraint if exists payment_transactions_positive_amount;

alter table payment_transactions
  add constraint payment_transactions_positive_amount
  check (amount > 0);
