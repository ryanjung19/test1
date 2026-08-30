import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

const requiredProductionSecrets = [
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "INTEGRATION_WEBHOOK_SECRET",
  "AUTOMATION_SECRET",
  "CUSTOMER_PORTAL_SECRET",
] as const;

export async function GET() {
  const missingSecrets =
    process.env.NODE_ENV === "production"
      ? requiredProductionSecrets.filter((name) => !process.env[name])
      : [];

  let database = false;
  if (isDatabaseConfigured()) {
    try {
      await db.execute(sql`select 1`);
      database = true;
    } catch {
      database = false;
    }
  }

  const ready = database && missingSecrets.length === 0;

  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      database,
      configuration: missingSecrets.length === 0 ? "ok" : "incomplete",
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
