"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  createPaymentRequest,
  PaymentValidationError,
  recordManualPaymentTransaction,
} from "@/lib/payments/service";

const requestSchema = z.object({
  bookingId: z.string().uuid(),
  kind: z.enum(["deposit", "interim", "balance", "additional"]),
  amount: z.coerce.number().int().positive(),
  dueAt: z.string().trim().max(40),
  memo: z.string().trim().max(5_000),
});

const transactionSchema = z.object({
  bookingId: z.string().uuid(),
  paymentRequestId: z.string().uuid(),
  type: z.enum(["charge", "refund"]),
  method: z.enum(["bank_transfer", "card_offline", "cash", "other"]),
  amount: z.coerce.number().int().positive(),
  approvedAt: z.string().trim().max(40),
  reference: z.string().trim().max(255),
  memo: z.string().trim().max(5_000),
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

function errorCode(error: unknown) {
  if (error instanceof PaymentValidationError) return error.code;
  if (error instanceof z.ZodError) return "invalid_request";
  return "internal_error";
}

export async function createPaymentRequestAction(formData: FormData) {
  await requireAdmin();
  let destination = "/payments?created=1";

  try {
    const payload = requestSchema.parse(Object.fromEntries(formData));
    await createPaymentRequest({
      bookingId: payload.bookingId,
      kind: payload.kind,
      amount: payload.amount,
      dueAt: seoulLocalInput(payload.dueAt),
      memo: payload.memo || undefined,
    });
  } catch (error) {
    destination = `/payments?error=${encodeURIComponent(errorCode(error))}`;
  }

  revalidatePath("/payments");
  redirect(destination);
}

export async function recordPaymentTransactionAction(formData: FormData) {
  await requireAdmin();
  let destination = "/payments?updated=1";

  try {
    const payload = transactionSchema.parse(Object.fromEntries(formData));
    await recordManualPaymentTransaction({
      bookingId: payload.bookingId,
      paymentRequestId: payload.paymentRequestId,
      type: payload.type,
      method: payload.method,
      amount: payload.amount,
      approvedAt: seoulLocalInput(payload.approvedAt),
      reference: payload.reference || undefined,
      memo: payload.memo || undefined,
    });
  } catch (error) {
    destination = `/payments?error=${encodeURIComponent(errorCode(error))}`;
  }

  revalidatePath("/payments");
  redirect(destination);
}
