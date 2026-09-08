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
    grant usage on schema public, auth to anon, authenticated, service_role;`);
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
