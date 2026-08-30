-- BASEMENT ONE initial tenant / venue / spaces.
-- Run after the generated Drizzle migrations have been applied.

insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'BASEMENT ONE', 'basement-one')
on conflict (slug) do nothing;

insert into venues (id, organization_id, name, slug, timezone, active)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'BASEMENT ONE',
  'basement-one-seoul',
  'Asia/Seoul',
  true
)
on conflict (organization_id, slug) do nothing;

insert into spaces (id, venue_id, name, code, floor, active)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000010',
    '1F',
    '1F',
    '1F',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000010',
    'B1',
    'B1',
    'B1',
    true
  )
on conflict (venue_id, code) do nothing;
