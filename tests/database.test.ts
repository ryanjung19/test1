import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, expect, test } from "vitest";

let db: PGlite;
const user = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
  for (const file of readdirSync("supabase/migrations").sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8").replace("create extension if not exists pgcrypto;", ""));
  }
});
afterAll(async () => { await db.close(); });

test("members cannot self-insert or rewrite consent receipts", async () => {
  const result = await db.query<{ insert_ok: boolean; update_ok: boolean }>(`select
    has_table_privilege('authenticated', 'public.consents', 'INSERT') as insert_ok,
    has_any_column_privilege('authenticated', 'public.consents', 'UPDATE') as update_ok`);
  expect(result.rows[0]).toEqual({ insert_ok: false, update_ok: false });
});
test("deleting auth membership does not delete billing history", async () => {
  await db.exec(`insert into auth.users values ('${user}');
    insert into public.subscriptions (user_id,provider,provider_subscription_id) values ('${user}','mock','retention-test');
    delete from auth.users where id='${user}';`);
  const result = await db.query<{ count: number }>("select count(*)::int as count from public.subscriptions where provider_subscription_id='retention-test'");
  expect(result.rows[0].count).toBe(1);
});

const alice = "22222222-2222-4222-8222-222222222222";
const bob = "33333333-3333-4333-8333-333333333333";
test("entitlement is the only access source, enforces dates and isolates users", async () => {
  await db.exec(`insert into auth.users values('${alice}'),('${bob}');
    insert into public.entitlements(user_id,capability,starts_at,ends_at) values('${alice}','market.hot',now()-interval '1 hour',now()+interval '1 hour');
    set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  expect((await db.query<{ allowed: boolean }>("select public.has_entitlement() as allowed")).rows[0].allowed).toBe(true);
  await db.exec(`select set_config('request.jwt.claim.sub','${bob}',false);`);
  expect((await db.query<{ allowed: boolean }>("select public.has_entitlement() as allowed")).rows[0].allowed).toBe(false);
  expect((await db.query("select * from public.entitlements")).rows).toHaveLength(0);
  await expect(db.exec(`insert into public.entitlements(user_id,capability,starts_at,ends_at) values('${bob}','market.hot',now(),now()+interval '1 hour')`)).rejects.toThrow();
  await db.exec(`reset role; update public.entitlements set ends_at=now() where user_id='${alice}'; set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  expect((await db.query<{ allowed: boolean }>("select public.has_entitlement() as allowed")).rows[0].allowed).toBe(false);
  await db.exec(`reset role; update public.entitlements set starts_at=now()+interval '1 hour',ends_at=now()+interval '2 hours' where user_id='${alice}'; set role authenticated;`);
  expect((await db.query<{ allowed: boolean }>("select public.has_entitlement() as allowed")).rows[0].allowed).toBe(false);
  await db.exec(`reset role; update public.entitlements set starts_at=now()-interval '1 hour',revoked_at=now() where user_id='${alice}'; set role authenticated;`);
  expect((await db.query<{ allowed: boolean }>("select public.has_entitlement() as allowed")).rows[0].allowed).toBe(false);
  await db.exec("reset role");
});

test("server consent is immutable, timestamped and survives account deletion", async () => {
  await db.exec(`set role service_role;`);
  const receipt = await db.query<{ id: string }>(`select public.record_consent('${bob}','terms','v1','${"a".repeat(64)}','accept','{"request_id":"test"}') as id`);
  const id = receipt.rows[0].id;
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${bob}',false);`);
  const own = await db.query<{ accepted_at: Date; document_hash: string }>("select accepted_at,document_hash from public.my_consents()");
  expect(own.rows).toHaveLength(1);
  expect(own.rows[0].document_hash).toBe("a".repeat(64));
  expect(new Date(own.rows[0].accepted_at).getTime()).toBeGreaterThan(Date.now()-60000);
  await expect(db.exec(`select public.record_consent('${bob}','terms','v2','${"a".repeat(64)}','accept','{"request_id":"forged"}')`)).rejects.toThrow();
  await db.exec(`select set_config('request.jwt.claim.sub','${alice}',false);`);
  expect((await db.query("select * from public.my_consents()")).rows).toHaveLength(0);
  await db.exec("reset role");
  await expect(db.exec(`update public.consents set document_version='forged' where id='${id}'`)).rejects.toThrow("Append-only record");
  await expect(db.exec(`delete from public.consents where id='${id}'`)).rejects.toThrow("Append-only record");
  await db.exec(`delete from auth.users where id='${bob}';`);
  expect((await db.query(`select id from public.consents where id='${id}'`)).rows).toHaveLength(1);
});

test("admin role cannot be self-assigned and overview excludes payment and Push secrets", async () => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  await expect(db.exec("select public.admin_overview()" )).rejects.toThrow("Administrator required");
  await expect(db.exec(`insert into public.member_roles(user_id,role) values('${alice}','admin')`)).rejects.toThrow();
  await db.exec(`reset role; insert into public.member_roles(user_id,role) values('${alice}','admin'); set role authenticated;`);
  const result = await db.query<{ overview: { members: number; subscriptions: unknown[] } }>("select public.admin_overview() as overview");
  expect(result.rows[0].overview.members).toBe(1);
  expect(result.rows[0].overview.subscriptions).toHaveLength(1);
  expect(JSON.stringify(result.rows)).not.toMatch(/auth_secret|p256dh|billingKey|payload_hash|legal_subject_id/);
  await db.exec("reset role");
});

test("billing readback checks amount; idempotency and stale events cannot double grant", async () => {
  const sub = await db.query<{ id: string }>(`insert into public.subscriptions(user_id,provider) values('${alice}','mock') returning id`);
  await db.exec(`insert into public.billing_orders(id,subscription_id,provider,payment_id,store_id,amount,period_start,period_end)
    values('order-1','${sub.rows[0].id}','mock','payment-1','store-1',1000,now()-interval '1 minute',now()+interval '1 month');`);
  const event = await db.query<{ id: string }>(`select public.receive_billing_event('mock','event-1','Transaction.Paid','payment-1','${"b".repeat(64)}') as id`);
  const id = event.rows[0].id;
  expect((await db.query<{ id: string }>(`select public.receive_billing_event('mock','event-1','Transaction.Paid','payment-1','${"b".repeat(64)}') as id`)).rows[0].id).toBe(id);
  await expect(db.exec(`select public.receive_billing_event('mock','event-1','Transaction.Paid','payment-1','${"c".repeat(64)}')`)).rejects.toThrow("Event content conflict");
  await expect(db.exec(`select public.apply_billing_payment('${id}','order-1','store-1',999,'KRW','paid',now())`)).rejects.toThrow("Payment verification mismatch");
  await expect(db.exec(`select public.apply_billing_payment('${id}','order-1',null,1000,'KRW','paid',now())`)).rejects.toThrow("Payment verification mismatch");
  await db.exec(`select public.apply_billing_payment('${id}','order-1','store-1',1000,'KRW','paid',now());
    select public.apply_billing_payment('${id}','order-1','store-1',1000,'KRW','paid',now());`);
  expect((await db.query(`select id from public.entitlements where subscription_id='${sub.rows[0].id}'`)).rows).toHaveLength(1);
  const stale = await db.query<{ id: string }>(`select public.receive_billing_event('mock','event-old','Transaction.Failed','payment-1','${"d".repeat(64)}') as id`);
  expect((await db.query<{ result: string }>(`select public.apply_billing_payment('${stale.rows[0].id}','order-1','store-1',1000,'KRW','failed',now()-interval '1 day') as result`)).rows[0].result).toBe("ignored");
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${alice}',false);`);
  expect((await db.query<{ result: boolean }>("select public.has_entitlement() as result")).rows[0].result).toBe(true);
  await db.exec("reset role");
});

test("subscription state machine rejects terminal resurrection and invalid transitions", async () => {
  const cases = [["inactive","paid","active"],["active","failed","past_due"],["past_due","paid","active"],["active","cancel_scheduled","cancel_at_period_end"],["cancel_at_period_end","expired","expired"],["active","refunded","canceled"]];
  for (const [state,event,next] of cases) expect((await db.query<{ result: string }>("select public.billing_next_status($1,$2) as result",[state,event])).rows[0].result).toBe(next);
  await expect(db.exec("select public.billing_next_status('canceled','paid')")).rejects.toThrow("Terminal subscription");
  await expect(db.exec("select public.billing_next_status('inactive','cancel_scheduled')")).rejects.toThrow("Invalid transition");
});

test("Push requires entitlement and preferences, and endpoint ownership cannot be stolen", async () => {
  await db.exec(`insert into auth.users values('${bob}');`);
  await db.exec(`select public.register_push('${alice}','https://fcm.googleapis.com/fcm/send/sample','public','secret');`);
  await expect(db.exec(`select public.register_push('${bob}','https://fcm.googleapis.com/fcm/send/sample','public','secret')`)).rejects.toThrow("Endpoint unavailable");
  expect((await db.query<{ result: boolean }>(`select public.can_deliver_push('${alice}','rapid_move') as result`)).rows[0].result).toBe(true);
  expect((await db.query<{ result: boolean }>(`select public.can_deliver_push('${bob}','rapid_move') as result`)).rows[0].result).toBe(false);
  await db.exec(`update public.notification_preferences set quiet_hours_enabled=true,quiet_start='00:00',quiet_end='00:00' where user_id='${alice}'`);
  expect((await db.query<{ result: boolean }>(`select public.can_deliver_push('${alice}','rapid_move') as result`)).rows[0].result).toBe(false);
});

test("Supabase default grants do not leave TRUNCATE on sensitive tables", async () => {
  for (const table of ["entitlements", "push_deliveries"]) {
    const result = await db.query<{ allowed: boolean }>("select has_table_privilege('anon',$1,'TRUNCATE') or has_table_privilege('authenticated',$1,'TRUNCATE') as allowed",[`public.${table}`]);
    expect(result.rows[0].allowed).toBe(false);
  }
});

async function renewalFixture(prefix: string) {
  const userId = crypto.randomUUID();
  await db.query("insert into auth.users values($1)", [userId]);
  const sub = (await db.query<{ id: string }>("insert into public.subscriptions(user_id,provider) values($1,'mock') returning id",[userId])).rows[0].id;
  await db.query(`insert into public.billing_orders(id,subscription_id,provider,payment_id,store_id,amount,period_start,period_end) values
    ($1,$3,'mock',$1,'test-store',1000,now()-interval '20 days',now()+interval '10 days'),
    ($2,$3,'mock',$2,'test-store',1000,now()+interval '10 days',now()+interval '40 days')`,[`${prefix}-current`,`${prefix}-next`,sub]);
  return { userId, sub };
}
async function applyOrder(order: string, status: string, hoursAgo: number) {
  const event = (await db.query<{ id: string }>("select public.receive_billing_event('mock',$1,$2,$3,$4) as id",[crypto.randomUUID(),status,order,"e".repeat(64)])).rows[0].id;
  return (await db.query<{ result: string }>("select public.apply_billing_payment($1,$2,'test-store',1000,'KRW',$3,$4) as result",[event,order,status,new Date(Date.now()-hoursAgo*3600000).toISOString()])).rows[0].result;
}
async function canAccess(userId: string) {
  await db.exec("set role authenticated");
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userId]);
    return (await db.query<{ result: boolean }>("select public.has_entitlement() as result")).rows[0].result;
  } finally { await db.exec("reset role"); }
}
test("early paid renewal keeps the current paid period accessible", async () => {
  const { userId } = await renewalFixture("early");
  await applyOrder("early-current","paid",2);
  expect(await canAccess(userId)).toBe(true);
  await applyOrder("early-next","paid",1);
  expect(await canAccess(userId)).toBe(true);
});
test("failed future renewal never revokes the current paid period", async () => {
  const { userId } = await renewalFixture("failed");
  await applyOrder("failed-current","paid",2);
  await applyOrder("failed-next","failed",1);
  expect(await canAccess(userId)).toBe(true);
});
test("late older-order refund is archived without revoking another paid order", async () => {
  const { userId, sub } = await renewalFixture("late");
  await db.query("update public.billing_orders set period_start=now()-interval '10 days',period_end=now()+interval '20 days' where id='late-next'");
  await applyOrder("late-next","paid",1);
  await applyOrder("late-current","refunded",2);
  expect((await db.query<{ status: string }>("select status from public.billing_orders where id='late-current'")).rows[0].status).toBe("refunded");
  expect((await db.query(`select r.id from legal_archive.records r join public.subscriptions s on s.legal_subject_id=r.subject_id where s.id=$1 and r.kind='refund'`,[sub])).rows).toHaveLength(1);
  expect(await canAccess(userId)).toBe(true);
});

test("refunding a future renewal preserves the current grant and never resurrects the refunded order", async () => {
  const { userId, sub } = await renewalFixture("refund");
  await applyOrder("refund-current","paid",3);
  await applyOrder("refund-next","paid",2);
  await applyOrder("refund-next","refunded",1);
  expect(await canAccess(userId)).toBe(true);
  expect(await applyOrder("refund-next","paid",0)).toBe("ignored");
  expect((await db.query("select id from public.entitlements where subscription_id=$1 and revoked_at is null",[sub])).rows).toHaveLength(1);
});
test("a refund at the same provider timestamp takes precedence over paid", async () => {
  const { userId } = await renewalFixture("same-time");
  const at = new Date(Date.now()-1000).toISOString();
  for (const status of ["paid","refunded"]) {
    const event = (await db.query<{ id: string }>("select public.receive_billing_event('mock',$1,$2,'same-time-current',$3) as id",[crypto.randomUUID(),status,"a".repeat(64)])).rows[0].id;
    await db.query("select public.apply_billing_payment($1,'same-time-current','test-store',1000,'KRW',$2,$3)",[event,status,at]);
  }
  expect(await canAccess(userId)).toBe(false);
});
test("closed contracts still archive payment evidence but never grant access", async () => {
  const { userId, sub } = await renewalFixture("closed");
  await db.query("update public.subscriptions set billing_status='canceled' where id=$1",[sub]);
  await applyOrder("closed-current","paid",1);
  expect(await canAccess(userId)).toBe(false);
  expect((await db.query("select id from legal_archive.records where payload->>'order_id'='closed-current'")).rows).toHaveLength(1);
});
