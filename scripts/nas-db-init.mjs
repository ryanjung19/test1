import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const expectedTables = [
  "organizations",
  "venues",
  "spaces",
  "bookings",
  "schedule_blocks",
  "payment_requests",
  "payment_transactions",
  "prospects",
  "leads",
];

const pool = new Pool({ connectionString, max: 2 });

async function tableState() {
  const result = await pool.query(
    `select tablename from pg_tables where schemaname = 'public' and tablename = any($1::text[])`,
    [expectedTables],
  );
  return new Set(result.rows.map((row) => row.tablename));
}

async function applySql(path) {
  const sql = await readFile(path, "utf8");
  await pool.query(sql);
}

try {
  const existing = await tableState();

  if (existing.size === 0) {
    console.log("[db-init] Empty database detected. Applying initial Drizzle schema.");
    execFileSync("npm", ["run", "db:push"], {
      stdio: "inherit",
      env: process.env,
    });
  } else if (expectedTables.every((table) => existing.has(table))) {
    console.log("[db-init] Existing VASSMENT ONE schema detected. Destructive schema push skipped.");
  } else {
    const missing = expectedTables.filter((table) => !existing.has(table));
    throw new Error(
      `Partial database schema detected. Refusing automatic schema push. Missing: ${missing.join(", ")}`,
    );
  }

  console.log("[db-init] Applying idempotent VASSMENT ONE bootstrap data.");
  await applySql("db/bootstrap.sql");

  console.log("[db-init] Applying PostgreSQL hardening constraints.");
  await applySql("db/hardening.sql");

  console.log("[db-init] Database initialization complete.");
} finally {
  await pool.end();
}
