begin;
create table public.billing_orders (
  id text primary key,
  subscription_id uuid not null references public.subscriptions(id),
  provider text not null check(provider in ('portone','toss','mock')),
  payment_id text not null,
  store_id text not null,
  amount bigint not null check(amount>0),
  currency text not null default 'KRW' check(currency='KRW'),
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'pending' check(status in ('pending','paid','failed','refunded')),
  check(period_end>period_start),
  unique(provider,payment_id)
);
create table public.billing_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null check(provider in ('portone','toss','mock')),
  provider_event_id text not null,
  event_type text not null,
  payment_id text not null,
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check(status in ('pending','processed','ignored')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider,provider_event_id)
);
alter table public.billing_orders enable row level security;
alter table public.billing_webhook_inbox enable row level security;
revoke all on public.billing_orders,public.billing_webhook_inbox from anon,authenticated;
grant select,insert,update on public.billing_orders,public.billing_webhook_inbox to service_role;

create function public.receive_billing_event(p_provider text,p_event_id text,p_type text,p_payment_id text,p_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result public.billing_webhook_inbox;
begin
  insert into public.billing_webhook_inbox(provider,provider_event_id,event_type,payment_id,payload_hash)
  values(p_provider,p_event_id,p_type,p_payment_id,p_hash) on conflict(provider,provider_event_id) do nothing;
  select * into strict result from public.billing_webhook_inbox where provider=p_provider and provider_event_id=p_event_id;
  if result.payload_hash<>p_hash then raise exception 'Event content conflict'; end if;
  return result.id;
end;
$$;
revoke all on function public.receive_billing_event(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.receive_billing_event(text,text,text,text,text) to service_role;

create function public.billing_next_status(p_current text,p_event text) returns text
language plpgsql immutable set search_path = '' as $$
begin
  if p_current not in ('inactive','active','past_due','cancel_at_period_end','canceled','expired') then raise exception 'Unknown billing state'; end if;
  if p_current in ('canceled','expired') then
    if p_event in ('canceled','refunded','expired') then return p_current; end if;
    raise exception 'Terminal subscription requires a new contract';
  end if;
  if p_event='paid' then return case when p_current='cancel_at_period_end' then p_current else 'active' end; end if;
  if p_event='failed' then return 'past_due'; end if;
  if p_event='cancel_scheduled' and p_current='active' then return 'cancel_at_period_end'; end if;
  if p_event in ('canceled','refunded') then return 'canceled'; end if;
  if p_event='expired' then return 'expired'; end if;
  raise exception 'Invalid transition';
end;
$$;
revoke all on function public.billing_next_status(text,text) from public,anon,authenticated;
grant execute on function public.billing_next_status(text,text) to service_role;

create function public.apply_billing_payment(p_inbox_id uuid,p_order_id text,p_store_id text,p_amount bigint,p_currency text,p_status text,p_verified_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare inbox public.billing_webhook_inbox; order_row public.billing_orders; sub public.subscriptions; next_state text;
begin
  select * into strict inbox from public.billing_webhook_inbox where id=p_inbox_id for update;
  if inbox.status <> 'pending' then return inbox.status; end if;
  select * into strict order_row from public.billing_orders where id=p_order_id for update;
  if order_row.provider<>inbox.provider or order_row.payment_id<>inbox.payment_id or order_row.store_id<>p_store_id or order_row.amount<>p_amount or order_row.currency<>p_currency then raise exception 'Payment verification mismatch'; end if;
  if p_status not in ('paid','failed','refunded') or p_verified_at is null or p_verified_at>now()+interval '5 minutes' then raise exception 'Invalid provider status'; end if;
  select * into strict sub from public.subscriptions where id=order_row.subscription_id for update;
  if sub.provider<>inbox.provider then raise exception 'Subscription provider mismatch'; end if;
  if sub.last_event_at is not null and p_verified_at<=sub.last_event_at then
    update public.billing_webhook_inbox set status='ignored',processed_at=now() where id=p_inbox_id;
    return 'ignored';
  end if;
  insert into legal_archive.records(subject_id,kind,reference_id,payload,retain_until)
  values(sub.legal_subject_id,case when p_status='refunded' then 'refund' else 'payment' end,inbox.id::text,
    jsonb_build_object('order_id',p_order_id,'provider',inbox.provider,'amount',p_amount,'currency',p_currency,'status',p_status,'verified_at',p_verified_at),now()+interval '5 years');
  update public.billing_orders set status=p_status where id=p_order_id;
  if sub.user_id is not null and (sub.current_period_end is null or order_row.period_end>=sub.current_period_end) then
    next_state := public.billing_next_status(sub.billing_status,p_status);
    update public.subscriptions set billing_status=next_state,current_period_start=order_row.period_start,current_period_end=order_row.period_end,last_event_at=p_verified_at where id=sub.id;
    if p_status='paid' then
      insert into public.entitlements(user_id,expert_id,capability,subscription_id,starts_at,ends_at)
      values(sub.user_id,sub.expert_id,'market.hot',sub.id,order_row.period_start,order_row.period_end)
      on conflict(subscription_id) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,revoked_at=null;
    else
      update public.entitlements set revoked_at=now() where subscription_id=sub.id;
    end if;
  end if;
  update public.billing_webhook_inbox set status='processed',processed_at=now() where id=p_inbox_id;
  return 'processed';
end;
$$;
revoke all on function public.apply_billing_payment(uuid,text,text,bigint,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_billing_payment(uuid,text,text,bigint,text,text,timestamptz) to service_role;
commit;
