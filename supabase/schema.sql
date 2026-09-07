-- MEETSET core schema for Supabase/PostgreSQL
-- Designed for a small (<1,000 users) event commerce service while keeping
-- ticketing, QR check-in, creator settlement and venue data normalized.

create extension if not exists pgcrypto;

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  handle text unique,
  bio text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text,
  is_home_venue boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  creator_id uuid references creators(id),
  venue_id uuid references venues(id),
  title text not null,
  eyebrow text,
  category text not null,
  status text not null check (status in ('draft','coming_soon','on_sale','sold_out','completed','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer,
  description text,
  cover_image_url text,
  hero_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  price_krw integer not null check (price_krw >= 0),
  quantity integer not null check (quantity >= 0),
  sale_order integer not null default 0,
  is_public boolean not null default true
);

create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  price_krw integer not null check (price_krw >= 0),
  quantity integer,
  is_public boolean not null default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text,
  phone text,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references customers(id),
  project_id uuid not null references projects(id),
  status text not null check (status in ('pending','paid','cancelled','partially_refunded','refunded')),
  gross_amount_krw integer not null check (gross_amount_krw >= 0),
  payment_provider text,
  payment_key text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_type text not null check (item_type in ('ticket','experience','merch')),
  ticket_tier_id uuid references ticket_tiers(id),
  experience_id uuid references experiences(id),
  name text not null,
  unit_price_krw integer not null check (unit_price_krw >= 0),
  quantity integer not null default 1 check (quantity > 0)
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text not null unique,
  order_id uuid not null references orders(id),
  project_id uuid not null references projects(id),
  ticket_tier_id uuid references ticket_tiers(id),
  customer_id uuid references customers(id),
  status text not null default 'valid' check (status in ('valid','used','cancelled','refunded')),
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references tickets(id),
  project_id uuid not null references projects(id),
  checked_in_at timestamptz not null default now(),
  operator_note text
);

create table if not exists project_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  creator_name text,
  social_url text,
  expected_audience integer,
  preferred_date date,
  contact text not null,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  cost_type text not null,
  amount_krw integer not null check (amount_krw >= 0),
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists projects_status_starts_idx on projects(status, starts_at);
create index if not exists orders_project_idx on orders(project_id, status);
create index if not exists tickets_project_idx on tickets(project_id, status);
