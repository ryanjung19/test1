begin;
create function public.register_push(p_user_id uuid,p_endpoint text,p_p256dh text,p_auth text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if (select count(*) from public.push_subscriptions where user_id=p_user_id) >= 10
    and not exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id=p_user_id) then raise exception 'Device limit'; end if;
  insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_secret) values(p_user_id,p_endpoint,p_p256dh,p_auth)
  on conflict(endpoint) do update set p256dh=excluded.p256dh,auth_secret=excluded.auth_secret,last_seen_at=now()
  where public.push_subscriptions.user_id=excluded.user_id returning id into result;
  if result is null then raise exception 'Endpoint unavailable'; end if;
  return result;
end;
$$;
revoke all on function public.register_push(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.register_push(uuid,text,text,text) to service_role;

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  event_id uuid not null references public.market_events(id),
  status text not null default 'pending' check(status in ('pending','accepted','failed','expired')),
  attempted_at timestamptz not null default now(),
  accepted_at timestamptz,
  provider_status integer,
  unique(subscription_id,event_id)
);
alter table public.push_deliveries enable row level security;
grant select on public.push_deliveries to authenticated;
grant select,insert,update on public.push_deliveries to service_role;
create policy push_deliveries_read_own on public.push_deliveries for select to authenticated using ((select auth.uid())=user_id);

create function public.can_deliver_push(p_user_id uuid,p_event_type text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.entitlements e join auth.users u on u.id=e.user_id
    join public.notification_preferences n on n.user_id=e.user_id
    where e.user_id=p_user_id and e.capability='market.hot' and e.expert_id='00000000-0000-4000-8000-000000000001'
    and e.revoked_at is null and e.starts_at<=now() and e.ends_at>now()
    and case p_event_type when 'rapid_move' then n.rapid_move when 'volume_spike' then n.volume_spike when 'news_disclosure' then n.news_disclosure else false end
    and not (n.quiet_hours_enabled and (n.quiet_start is null or n.quiet_end is null or n.quiet_start=n.quiet_end
      or (n.quiet_start<n.quiet_end and (now() at time zone 'Asia/Seoul')::time >= n.quiet_start and (now() at time zone 'Asia/Seoul')::time < n.quiet_end)
      or (n.quiet_start>n.quiet_end and ((now() at time zone 'Asia/Seoul')::time >= n.quiet_start or (now() at time zone 'Asia/Seoul')::time < n.quiet_end)))));
$$;
revoke all on function public.can_deliver_push(uuid,text) from public, anon, authenticated;
grant execute on function public.can_deliver_push(uuid,text) to service_role;
commit;
