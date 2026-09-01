"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  createQuoteVersion,
  QuoteValidationError,
  updateQuoteStatus,
} from "@/lib/quotes/service";

const itemSchema = z.object({
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(240),
  quantity: z.number().int().positive().max(10_000),
  unitPrice: z.number().int().min(0).max(2_000_000_000),
});

const createSchema = z.object({
  bookingId: z.string().uuid(),
  itemsJson: z.string().min(2).max(100_000),
  discountAmount: z.coerce.number().int().min(0),
  vatRate: z.coerce.number().int().min(0).max(100),
  validUntil: z.string().trim().max(40),
  notes: z.string().trim().max(10_000),
});

const statusSchema = z.object({
  bookingId: z.string().uuid(),
  quoteId: z.string().uuid(),
  status: z.enum(["sent", "accepted", "rejected", "expired", "cancelled"]),
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

function code(error: unknown) {
  if (error instanceof QuoteValidationError) return error.code;
  if (error instanceof z.ZodError) return "invalid_request";
  return "internal_error";
}

export async function createQuoteAction(formData: FormData) {
  await requireAdmin();
  let bookingId = String(formData.get("bookingId") ?? "");
  let destination = `/bookings/${bookingId}/quote?created=1`;

  try {
    const payload = createSchema.parse(Object.fromEntries(formData));
    bookingId = payload.bookingId;
    const items = z.array(itemSchema).min(1).max(100).parse(JSON.parse(payload.itemsJson));

    await createQuoteVersion({
      bookingId,
      items,
      discountAmount: payload.discountAmount,
      vatRate: payload.vatRate,
      validUntil: seoulLocalInput(payload.validUntil),
      notes: payload.notes || undefined,
    });
    destination = `/bookings/${bookingId}/quote?created=1`;
  } catch (error) {
    destination = `/bookings/${bookingId}/quote?error=${encodeURIComponent(code(error))}`;
  }

  revalidatePath(`/bookings/${bookingId}/quote`);
  redirect(destination);
}

export async function updateQuoteStatusAction(formData: FormData) {
  await requireAdmin();
  let bookingId = String(formData.get("bookingId") ?? "");
  let destination = `/bookings/${bookingId}/quote?updated=1`;

  try {
    const payload = statusSchema.parse(Object.fromEntries(formData));
    bookingId = payload.bookingId;
    await updateQuoteStatus({ quoteId: payload.quoteId, status: payload.status });
  } catch (error) {
    destination = `/bookings/${bookingId}/quote?error=${encodeURIComponent(code(error))}`;
  }

  revalidatePath(`/bookings/${bookingId}/quote`);
  redirect(destination);
}
