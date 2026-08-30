import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { leads, prospects } from "@/db/schema";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

export type ProspectInput = {
  companyName: string;
  segment: string;
  sourceType?: string;
  sourceUrl?: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  socialHandle?: string;
  fitScore?: number;
  rationale?: string;
  evidence?: Record<string, unknown>;
  dedupeKey?: string;
};

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
}

function prospectDedupeKey(item: ProspectInput) {
  if (item.dedupeKey?.trim()) return item.dedupeKey.trim();
  const material = [normalize(item.companyName), normalize(item.websiteUrl), normalize(item.socialHandle)].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export async function ingestProspects(items: ProspectInput[]) {
  const results = [];

  for (const item of items) {
    const dedupeKey = prospectDedupeKey(item);
    const [row] = await db
      .insert(prospects)
      .values({
        organizationId: VASSMENT_ONE.organizationId,
        venueId: VASSMENT_ONE.venueId,
        companyName: item.companyName.trim(),
        segment: item.segment.trim(),
        sourceType: item.sourceType?.trim(),
        sourceUrl: item.sourceUrl?.trim(),
        websiteUrl: item.websiteUrl?.trim(),
        email: item.email?.trim(),
        phone: item.phone?.trim(),
        socialHandle: item.socialHandle?.trim(),
        fitScore: item.fitScore,
        rationale: item.rationale?.trim(),
        evidence: item.evidence,
        dedupeKey,
      })
      .onConflictDoUpdate({
        target: [prospects.organizationId, prospects.dedupeKey],
        set: {
          segment: item.segment.trim(),
          sourceType: item.sourceType?.trim(),
          sourceUrl: item.sourceUrl?.trim(),
          websiteUrl: item.websiteUrl?.trim(),
          email: item.email?.trim(),
          phone: item.phone?.trim(),
          socialHandle: item.socialHandle?.trim(),
          fitScore: item.fitScore,
          rationale: item.rationale?.trim(),
          evidence: item.evidence,
        },
      })
      .returning();

    results.push(row);
  }

  return results;
}

export async function reviewProspect(params: {
  prospectId: string;
  status: "reviewed" | "approved" | "rejected";
}) {
  const [updated] = await db
    .update(prospects)
    .set({ status: params.status, reviewedAt: new Date() })
    .where(eq(prospects.id, params.prospectId))
    .returning();

  if (!updated) throw new Error("prospect_not_found");
  return updated;
}

export async function convertProspectToLead(prospectId: string) {
  return db.transaction(async (tx) => {
    const [prospect] = await tx
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);

    if (!prospect) throw new Error("prospect_not_found");
    if (prospect.status === "rejected") throw new Error("prospect_rejected");
    if (prospect.status === "converted") throw new Error("prospect_already_converted");

    const [lead] = await tx
      .insert(leads)
      .values({
        organizationId: VASSMENT_ONE.organizationId,
        venueId: VASSMENT_ONE.venueId,
        prospectId: prospect.id,
        title: prospect.companyName,
        segment: prospect.segment,
        source: "outbound",
        status: "new",
        probability: prospect.fitScore ?? undefined,
        notes: [prospect.rationale, prospect.sourceUrl ? `Source: ${prospect.sourceUrl}` : null]
          .filter(Boolean)
          .join("\n") || undefined,
      })
      .returning();

    await tx
      .update(prospects)
      .set({ status: "converted", reviewedAt: new Date() })
      .where(eq(prospects.id, prospect.id));

    return lead;
  });
}
