"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { interactions, leads } from "@/db/schema";
import { hasAdminSession } from "@/lib/auth/admin-session";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

const interactionSchema = z.object({
  leadId: z.string().uuid(),
  bookingId: z.string().uuid().optional().or(z.literal("")),
  channel: z.enum([
    "phone",
    "email",
    "website",
    "chatbot",
    "kakao",
    "instagram",
    "facebook",
    "sms",
    "meeting",
    "ad",
    "note",
    "other",
  ]),
  direction: z.enum(["inbound", "outbound", "internal"]),
  subject: z.string().trim().max(240),
  summary: z.string().trim().min(1).max(10_000),
  nextActionAt: z.string().trim().max(40),
});

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum([
    "new",
    "qualified",
    "contacted",
    "responded",
    "opportunity",
    "won",
    "lost",
  ]),
  nextActionAt: z.string().trim().max(40),
});

function seoulLocalInput(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${normalized}+09:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function requireAdmin() {
  if (!(await hasAdminSession())) redirect("/login");
}

export async function addInteractionAction(formData: FormData) {
  await requireAdmin();
  let destination = "/crm?updated=1";

  try {
    const payload = interactionSchema.parse(Object.fromEntries(formData));
    const nextActionAt = seoulLocalInput(payload.nextActionAt);

    await db.transaction(async (tx) => {
      await tx.insert(interactions).values({
        organizationId: VASSMENT_ONE.organizationId,
        leadId: payload.leadId,
        bookingId: payload.bookingId || undefined,
        channel: payload.channel,
        direction: payload.direction,
        subject: payload.subject || undefined,
        summary: payload.summary,
        nextActionAt,
      });

      if (nextActionAt) {
        await tx
          .update(leads)
          .set({ nextActionAt, updatedAt: new Date() })
          .where(eq(leads.id, payload.leadId));
      }
    });
  } catch {
    destination = "/crm?error=invalid_request";
  }

  revalidatePath("/crm");
  redirect(destination);
}

export async function updateLeadStatusAction(formData: FormData) {
  await requireAdmin();
  let destination = "/crm?updated=1";

  try {
    const payload = statusSchema.parse(Object.fromEntries(formData));
    await db
      .update(leads)
      .set({
        status: payload.status,
        nextActionAt: seoulLocalInput(payload.nextActionAt) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, payload.leadId));
  } catch {
    destination = "/crm?error=invalid_request";
  }

  revalidatePath("/crm");
  redirect(destination);
}
