"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  convertProspectToLead,
  ingestProspects,
  reviewProspect,
} from "@/lib/prospects/service";

const manualSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  segment: z.string().trim().min(1).max(120),
  sourceType: z.string().trim().max(80),
  sourceUrl: z.string().trim().max(2_000),
  websiteUrl: z.string().trim().max(2_000),
  email: z.string().trim().max(320),
  phone: z.string().trim().max(60),
  socialHandle: z.string().trim().max(160),
  fitScore: z.string().trim().max(3),
  rationale: z.string().trim().max(5_000),
});

const reviewSchema = z.object({
  prospectId: z.string().uuid(),
  action: z.enum(["reviewed", "approved", "rejected", "convert"]),
});

async function requireAdmin() {
  if (!(await hasAdminSession())) redirect("/login");
}

function optionalUrl(value: string) {
  if (!value) return undefined;
  return z.string().url().parse(value);
}

export async function createManualProspectAction(formData: FormData) {
  await requireAdmin();
  let destination = "/prospects?created=1";

  try {
    const payload = manualSchema.parse(Object.fromEntries(formData));
    const fitScore = payload.fitScore ? Number(payload.fitScore) : undefined;

    await ingestProspects([
      {
        companyName: payload.companyName,
        segment: payload.segment,
        sourceType: payload.sourceType || "manual",
        sourceUrl: optionalUrl(payload.sourceUrl),
        websiteUrl: optionalUrl(payload.websiteUrl),
        email: payload.email || undefined,
        phone: payload.phone || undefined,
        socialHandle: payload.socialHandle || undefined,
        fitScore,
        rationale: payload.rationale || undefined,
      },
    ]);
  } catch {
    destination = "/prospects?error=invalid_request";
  }

  revalidatePath("/prospects");
  redirect(destination);
}

export async function reviewProspectAction(formData: FormData) {
  await requireAdmin();
  let destination = "/prospects?updated=1";

  try {
    const payload = reviewSchema.parse(Object.fromEntries(formData));
    if (payload.action === "convert") {
      await convertProspectToLead(payload.prospectId);
      revalidatePath("/crm");
    } else {
      await reviewProspect({
        prospectId: payload.prospectId,
        status: payload.action,
      });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_request";
    destination = `/prospects?error=${encodeURIComponent(code)}`;
  }

  revalidatePath("/prospects");
  redirect(destination);
}
