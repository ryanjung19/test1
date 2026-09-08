begin;

create schema legal_archive;
revoke all on schema legal_archive from public, anon, authenticated;

create table legal_archive.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
insert into legal_archive.subjects(user_id) select id from auth.users;

create table legal_archive.records (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references legal_archive.subjects(id),
  kind text not null check (kind in ('payment','refund','contract','dispute','legacy_consent')),
  reference_id text not null,
  payload jsonb not null,
  recorded_at timestamptz not null default now(),
  retain_until timestamptz not null,
  legal_hold boolean not null default false,
  unique(kind, reference_id)
);

create function legal_archive.subject_for(p_user_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  insert into legal_archive.subjects(user_id) values (p_user_id)
  on conflict (user_id) do update set user_id = excluded.user_id returning id into result;
  return result;
end;
$$;
revoke all on function legal_archive.subject_for(uuid) from public, anon, authenticated;

alter table public.subscriptions drop constraint subscriptions_user_id_fkey;
alter table public.subscriptions alter column user_id drop not null;
alter table public.subscriptions add foreign key(user_id) references auth.users(id) on delete set null;
alter table public.subscriptions add column legal_subject_id uuid references legal_archive.subjects(id);
update public.subscriptions s set legal_subject_id = a.id from legal_archive.subjects a where a.user_id=s.user_id;
alter table public.subscriptions alter column legal_subject_id set not null;
alter table public.subscriptions rename column status to billing_status;
alter table public.subscriptions add column last_event_at timestamptz;

create function public.attach_legal_subject() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is null then raise exception 'Member required'; end if;
  new.legal_subject_id := legal_archive.subject_for(new.user_id);
  return new;
end;
$$;
revoke all on function public.attach_legal_subject() from public, anon, authenticated;
create trigger subscriptions_subject before insert on public.subscriptions
for each row execute function public.attach_legal_subject();

insert into legal_archive.records(subject_id,kind,reference_id,payload,retain_until)
select legal_subject_id,'contract',id::text,to_jsonb(s)-'user_id',now()+interval '5 years' from public.subscriptions s;

create function public.archive_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into legal_archive.records(subject_id,kind,reference_id,payload,retain_until)
  values(new.legal_subject_id,'contract',gen_random_uuid()::text,to_jsonb(new)-'user_id',now()+interval '5 years');
  return new;
end;
$$;
revoke all on function public.archive_subscription() from public, anon, authenticated;
create trigger subscriptions_archive after insert or update of billing_status, current_period_end on public.subscriptions
for each row execute function public.archive_subscription();

create table public.experts (
  id uuid primary key,
  slug text unique not null,
  display_name text not null,
  marketplace_visible boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.experts(id,slug,display_name) values ('00000000-0000-4000-8000-000000000001','stockpulse','StockPulse');
alter table public.subscriptions add column expert_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.experts(id);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expert_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.experts(id),
  capability text not null check (capability in ('market.hot')),
  subscription_id uuid unique references public.subscriptions(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revoked_at timestamptz,
  check (ends_at > starts_at)
);
insert into public.entitlements(user_id,capability,subscription_id,starts_at,ends_at)
select user_id,'market.hot',id,current_period_start,current_period_end from public.subscriptions
where billing_status in ('active','cancel_at_period_end') and current_period_start <= now() and current_period_end > now();
alter table public.profiles drop column plan;
alter table public.entitlements enable row level security;
grant select on public.entitlements to authenticated;
grant select,insert,update,delete on public.entitlements to service_role;
create policy entitlement_read_own on public.entitlements for select to authenticated using ((select auth.uid())=user_id);

create function public.has_entitlement() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.entitlements e join auth.users u on u.id=e.user_id
    where e.user_id=auth.uid() and e.capability='market.hot'
    and e.expert_id='00000000-0000-4000-8000-000000000001'
    and e.starts_at <= now() and e.ends_at > now() and e.revoked_at is null);
$$;
revoke all on function public.has_entitlement() from public, anon;
grant execute on function public.has_entitlement() to authenticated;

insert into legal_archive.records(subject_id,kind,reference_id,payload,retain_until)
select a.id,'legacy_consent',c.id::text,to_jsonb(c)-'user_id',now()+interval '5 years'
from public.consents c join legal_archive.subjects a on a.user_id=c.user_id;
drop policy consents_select_own on public.consents;
drop policy consents_insert_own on public.consents;
drop policy consents_update_own on public.consents;
revoke all on public.consents from anon, authenticated, service_role;
revoke update(withdrawn_at) on public.consents from authenticated;
alter table public.consents add column subject_id uuid references legal_archive.subjects(id);
update public.consents c set subject_id=a.id from legal_archive.subjects a where c.user_id=a.user_id;
alter table public.consents alter column subject_id set not null;
alter table public.consents drop column user_id;
alter table public.consents add column document_hash text;
alter table public.consents add column evidence_level text not null default 'legacy_unverified';
alter table public.consents add column action text not null default 'accept' check(action in ('accept','withdraw'));
alter table public.consents add column prior_consent_id uuid references public.consents(id);
alter table public.consents add column transaction_context jsonb not null default '{}'::jsonb;
alter table public.consents add column retain_until timestamptz not null default now()+interval '5 years';
alter table public.consents add constraint consent_evidence check (
  evidence_level='legacy_unverified' or
  (evidence_level='server_verified' and document_hash ~ '^[a-f0-9]{64}$' and transaction_context ? 'request_id')
);

create function public.prevent_receipt_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'Append-only record'; end;
$$;
revoke all on function public.prevent_receipt_mutation() from public, anon, authenticated;
create trigger consents_immutable before update or delete on public.consents for each row execute function public.prevent_receipt_mutation();
create trigger archive_immutable before update or delete on legal_archive.records for each row execute function public.prevent_receipt_mutation();

create function public.record_consent(p_user_id uuid,p_type text,p_version text,p_hash text,p_action text,p_context jsonb,p_prior_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; subject uuid;
begin
  subject := legal_archive.subject_for(p_user_id);
  if p_type not in ('terms','privacy') or length(p_version)>80 or p_action not in ('accept','withdraw') then raise exception 'Invalid receipt'; end if;
  if p_action='withdraw' and not exists(select 1 from public.consents where id=p_prior_id and subject_id=subject and consent_type=p_type and action='accept') then raise exception 'Invalid prior receipt'; end if;
  insert into public.consents(subject_id,consent_type,document_version,document_hash,evidence_level,action,prior_consent_id,transaction_context)
  values(subject,p_type,p_version,p_hash,'server_verified',p_action,p_prior_id,p_context) returning id into result;
  return result;
end;
$$;
revoke all on function public.record_consent(uuid,text,text,text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.record_consent(uuid,text,text,text,text,jsonb,uuid) to service_role;

create function public.my_consents() returns setof public.consents
language sql stable security definer set search_path = '' as $$
select c.* from public.consents c join legal_archive.subjects s on c.subject_id=s.id where s.user_id=auth.uid();
$$;
revoke all on function public.my_consents() from public, anon;
grant execute on function public.my_consents() to authenticated;

create table public.market_events (
  id uuid primary key default gen_random_uuid(),
  stock_code text not null,
  event_type text not null check(event_type in ('rapid_move','volume_spike','news_disclosure')),
  observed_at timestamptz not null,
  detected_at timestamptz not null default now(),
  source text not null,
  is_demo boolean not null default true,
  metrics jsonb not null
);
create table public.expert_contents (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id),
  market_event_id uuid references public.market_events(id),
  body text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.experts enable row level security;
alter table public.market_events enable row level security;
alter table public.expert_contents enable row level security;
revoke all on public.experts, public.market_events, public.expert_contents from anon, authenticated;
grant select,insert,update,delete on public.experts,public.market_events,public.expert_contents,public.subscriptions,public.push_subscriptions to service_role;
revoke insert,update on public.push_subscriptions from authenticated;

commit;
