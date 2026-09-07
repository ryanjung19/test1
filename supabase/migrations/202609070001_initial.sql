-- StockPulse initial member/subscription schema
-- Apply with Supabase CLI or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'portone',
  provider_subscription_id text,
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'cancel_at_period_end', 'canceled', 'expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_provider_id_key
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null check (char_length(stock_code) between 1 and 20),
  created_at timestamptz not null default now(),
  primary key (user_id, stock_code)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rapid_move boolean not null default true,
  volume_spike boolean not null default true,
  news_disclosure boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_start time,
  quiet_end time,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  device_label text,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (user_id, consent_type, document_version)
);
create index if not exists consents_user_id_idx on public.consents(user_id);

create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_code text not null,
  stock_name text not null,
  alert_type text not null check (alert_type in ('rapid_move', 'volume_spike', 'news_disclosure')),
  title text not null,
  body text not null,
  detected_at timestamptz not null,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists alert_deliveries_user_time_idx on public.alert_deliveries(user_id, delivered_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.watchlist enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.consents enable row level security;
alter table public.alert_deliveries enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.watchlist from anon, authenticated;
revoke all on table public.notification_preferences from anon, authenticated;
revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.consents from anon, authenticated;
revoke all on table public.alert_deliveries from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert, delete on table public.watchlist to authenticated;
grant select, insert, update on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert on table public.consents to authenticated;
grant update (withdrawn_at) on table public.consents to authenticated;
grant select on table public.alert_deliveries to authenticated;
grant update (read_at) on table public.alert_deliveries to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists watchlist_select_own on public.watchlist;
create policy watchlist_select_own on public.watchlist
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists watchlist_insert_own on public.watchlist;
create policy watchlist_insert_own on public.watchlist
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists watchlist_delete_own on public.watchlist;
create policy watchlist_delete_own on public.watchlist
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists consents_select_own on public.consents;
create policy consents_select_own on public.consents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists consents_update_own on public.consents;
create policy consents_update_own on public.consents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists alert_deliveries_select_own on public.alert_deliveries;
create policy alert_deliveries_select_own on public.alert_deliveries
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists alert_deliveries_update_own on public.alert_deliveries;
create policy alert_deliveries_update_own on public.alert_deliveries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
