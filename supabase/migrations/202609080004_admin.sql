begin;
create table public.member_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role='admin'),
  assigned_at timestamptz not null default now()
);
alter table public.member_roles enable row level security;
revoke all on public.member_roles from anon,authenticated;
grant select,insert,delete on public.member_roles to service_role;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.member_roles r join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.role='admin') then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  return jsonb_build_object(
    'members',(select count(*) from public.profiles),
    'activeEntitlements',(select count(*) from public.entitlements where starts_at<=now() and ends_at>now() and revoked_at is null),
    'pendingWebhooks',(select count(*) from public.billing_webhook_inbox where status='pending'),
    'failedPush',(select count(*) from public.push_deliveries where status in ('failed','expired')),
    'subscriptions',coalesce((select jsonb_agg(x) from (select id,provider,billing_status,current_period_end from public.subscriptions order by updated_at desc limit 20) x),'[]'::jsonb),
    'webhooks',coalesce((select jsonb_agg(x) from (select id,provider,event_type,status,received_at from public.billing_webhook_inbox order by received_at desc limit 20) x),'[]'::jsonb),
    'pushDeliveries',coalesce((select jsonb_agg(x) from (select id,status,provider_status,attempted_at from public.push_deliveries order by attempted_at desc limit 20) x),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;
commit;
