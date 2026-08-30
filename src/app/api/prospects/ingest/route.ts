import { NextResponse } from "next/server";
import { z } from "zod";

import { isDatabaseConfigured } from "@/db";
import { verifyIntegrationSecret } from "@/lib/integrations/shared-secret";
import { ingestProspects } from "@/lib/prospects/service";

const prospectSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  segment: z.string().trim().min(1).max(120),
  sourceType: z.string().trim().max(80).optional(),
  sourceUrl: z.string().url().max(2_000).optional(),
  websiteUrl: z.string().url().max(2_000).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().trim().max(60).optional(),
  socialHandle: z.string().trim().max(160).optional(),
  fitScore: z.number().int().min(0).max(100).optional(),
  rationale: z.string().trim().max(5_000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  dedupeKey: z.string().trim().max(255).optional(),
});

const batchSchema = z.object({
  prospects: z.array(prospectSchema).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    if (!verifyIntegrationSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "service_not_configured" }, { status: 503 });
    }

    const payload = batchSchema.parse(await request.json());
    const rows = await ingestProspects(payload.prospects);

    return NextResponse.json(
      {
        accepted: rows.length,
        prospectIds: rows.map((row) => row.id),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_request", issues: error.issues },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
