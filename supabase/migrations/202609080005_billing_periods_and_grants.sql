begin;

revoke all on public.entitlements,public.push_deliveries from anon,authenticated;
grant select on public.entitlements,public.push_deliveries to authenticated;

-- A renewal buys a separate interval; it must not overwrite the current paid interval.
alter table public.entitlements drop constraint entitlements_subscription_id_key;
alter table public.entitlements add column billing_order_id text unique references public.billing_orders(id);
alter table public.billing_orders add column last_verified_at timestamptz;

create or replace function public.apply_billing_payment(p_inbox_id uuid,p_order_id text,p_store_id text,p_amount bigint,p_currency text,p_status text,p_verified_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare inbox public.billing_webhook_inbox; order_row public.billing_orders; sub public.subscriptions; next_state text;
begin
  select * into strict inbox from public.billing_webhook_inbox where id=p_inbox_id for update;
  if inbox.status <> 'pending' then return inbox.status; end if;
  select * into strict order_row from public.billing_orders where id=p_order_id for update;
  if order_row.provider is distinct from inbox.provider or order_row.payment_id is distinct from inbox.payment_id or order_row.store_id is distinct from p_store_id or order_row.amount is distinct from p_amount or order_row.currency is distinct from p_currency then raise exception 'Payment verification mismatch'; end if;
  if p_status is null or p_status not in ('paid','failed','refunded') or p_verified_at is null or p_verified_at>now()+interval '5 minutes' then raise exception 'Invalid provider status'; end if;
  select * into strict sub from public.subscriptions where id=order_row.subscription_id for update;
  if sub.provider<>inbox.provider then raise exception 'Subscription provider mismatch'; end if;

  -- Preserve every verified receipt, including delayed events for an older invoice.
  insert into legal_archive.records(subject_id,kind,reference_id,payload,retain_until)
  values(sub.legal_subject_id,case when p_status='refunded' then 'refund' else 'payment' end,inbox.id::text,
    jsonb_build_object('order_id',p_order_id,'provider',inbox.provider,'amount',p_amount,'currency',p_currency,'status',p_status,'verified_at',p_verified_at),now()+interval '5 years');
  if order_row.status='refunded' or (order_row.status='paid' and p_status='failed')
    or p_verified_at<order_row.last_verified_at
    or (p_verified_at=order_row.last_verified_at and
      array_position(array['pending','failed','paid','refunded'],p_status)<=array_position(array['pending','failed','paid','refunded'],order_row.status)) then
    update public.billing_webhook_inbox set status='ignored',processed_at=now() where id=p_inbox_id;
    return 'ignored';
  end if;
  update public.billing_orders set status=p_status,last_verified_at=p_verified_at where id=p_order_id;

  if p_status='refunded' then
    update public.entitlements set revoked_at=coalesce(revoked_at,now())
    where billing_order_id=p_order_id or (subscription_id=sub.id and billing_order_id is null
      and starts_at=order_row.period_start and ends_at=order_row.period_end);
  elsif p_status='paid' and sub.user_id is not null and sub.billing_status not in ('canceled','expired') then
    -- Attach an exact legacy interval when present, preserving its historical bounds.
    update public.entitlements set billing_order_id=p_order_id,revoked_at=null
    where subscription_id=sub.id and billing_order_id is null
      and starts_at=order_row.period_start and ends_at=order_row.period_end;
    insert into public.entitlements(user_id,expert_id,capability,subscription_id,billing_order_id,starts_at,ends_at)
    values(sub.user_id,sub.expert_id,'market.hot',sub.id,p_order_id,order_row.period_start,order_row.period_end)
    on conflict(billing_order_id) do nothing;
  end if;

  if sub.user_id is not null and sub.billing_status not in ('canceled','expired')
    and (sub.current_period_end is null or order_row.period_end>=sub.current_period_end) then
    -- Refunding one invoice is not cancellation of every period in the contract.
    if p_status='refunded' then
      next_state := case when exists(select 1 from public.entitlements where subscription_id=sub.id and revoked_at is null and ends_at>now())
        then case when sub.billing_status='cancel_at_period_end' then sub.billing_status else 'active' end
        else 'past_due' end;
    else
      next_state := public.billing_next_status(sub.billing_status,p_status);
    end if;
    update public.subscriptions set billing_status=next_state,current_period_start=order_row.period_start,
      current_period_end=order_row.period_end,last_event_at=greatest(last_event_at,p_verified_at) where id=sub.id;
  end if;
  update public.billing_webhook_inbox set status='processed',processed_at=now() where id=p_inbox_id;
  return 'processed';
end;
$$;
commit;
