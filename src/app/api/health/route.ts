import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/db";
import { productionConfigurationIssues } from "@/lib/config/secrets";

export const dynamic = "force-dynamic";

export async function GET() {
  const configurationIssues = productionConfigurationIssues();

  let database = false;
  if (isDatabaseConfigured()) {
    try {
      await db.execute(sql`select 1`);
      database = true;
    } catch {
      database = false;
    }
  }

  const ready = database && configurationIssues.length === 0;

  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      database,
      configuration: configurationIssues.length === 0 ? "ok" : "incomplete",
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
