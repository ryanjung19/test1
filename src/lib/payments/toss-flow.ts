import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, paymentRequests, paymentTransactions } from "@/db/schema";

const TOSS_PROVIDER = "toss";
type FetchLike = typeof fetch;
type PaymentNetRow = { type: "charge" | "refund"; amount: number };

type TossPaymentResponse = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount?: number;
  approvedAt?: string;
  method?: string;
  receipt?: { url?: string } | null;
};

type TossErrorResponse = { code?: string; message?: string };

export class TossPaymentError extends Error {
  constructor(
    public readonly code:
      | "toss_not_configured"
      | "payment_request_not_found"
      | "payment_already_completed"
      | "payment_intent_not_found"
      | "payment_intent_not_pending"
      | "payment_intent_mismatch"
      | "payment_amount_changed"
      | "toss_confirm_failed"
      | "toss_invalid_response",
    public readonly providerMessage?: string,
  ) {
    super(providerMessage ? `${code}: ${providerMessage}` : code);
    this.name = "TossPaymentError";
  }
}

function tossClientKey() {
  return process.env.TOSS_CLIENT_KEY;
}

function tossSecretKey() {
  return process.env.TOSS_SECRET_KEY;
}

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function tossPaymentsConfigured() {
  return Boolean(tossClientKey() && tossSecretKey());
}

function buildOrderId() {
  return `V1-${Date.now().toString(36)}-${randomBytes(9).toString("hex")}`;
}

function netPaid(rows: PaymentNetRow[]) {
  return rows.reduce(
    (sum, row) => sum + (row.type === "charge" ? row.amount : -row.amount),
    0,
  );
}

export async function createTossPaymentIntent(params: {
  bookingId: string;
  paymentRequestId: string;
}) {
  const clientKey = tossClientKey();
  const secretKey = tossSecretKey();
  if (!clientKey || !secretKey) throw new TossPaymentError("toss_not_configured");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment:${params.paymentRequestId}`})::bigint)`);

    const [request] = await tx.select().from(paymentRequests).where(
      and(
        eq(paymentRequests.id, params.paymentRequestId),
        eq(paymentRequests.bookingId, params.bookingId),
      ),
    ).limit(1);
    if (!request || request.status === "cancelled") {
      throw new TossPaymentError("payment_request_not_found");
    }

    const [booking] = await tx.select({ id: bookings.id, title: bookings.title }).from(bookings)
      .where(eq(bookings.id, params.bookingId)).limit(1);
    if (!booking) throw new TossPaymentError("payment_request_not_found");

    const paidRows = await tx.select({ type: paymentTransactions.type, amount: paymentTransactions.amount })
      .from(paymentTransactions).where(
        and(
          eq(paymentTransactions.paymentRequestId, request.id),
          eq(paymentTransactions.status, "succeeded"),
        ),
      );
    const outstanding = request.amount - netPaid(paidRows);
    if (outstanding <= 0) throw new TossPaymentError("payment_already_completed");

    await tx.update(paymentTransactions).set({
      status: "cancelled",
      metadata: { reason: "superseded_by_new_toss_intent" },
    }).where(
      and(
        eq(paymentTransactions.paymentRequestId, request.id),
        eq(paymentTransactions.provider, TOSS_PROVIDER),
        eq(paymentTransactions.status, "pending"),
      ),
    );

    const orderId = buildOrderId();
    const [intent] = await tx.insert(paymentTransactions).values({
      bookingId: booking.id,
      paymentRequestId: request.id,
      type: "charge",
      method: "card_online",
      status: "pending",
      provider: TOSS_PROVIDER,
      providerPaymentId: orderId,
      amount: outstanding,
      metadata: { orderId },
    }).returning();

    return {
      intentId: intent.id,
      clientKey,
      orderId,
      orderName: `${booking.title} ${request.kind}`.slice(0, 100),
      amount: outstanding,
      successUrl: `${appUrl()}/payment/toss/success?intentId=${intent.id}`,
      failUrl: `${appUrl()}/payment/toss/fail?intentId=${intent.id}`,
    };
  });
}

async function confirmWithToss(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
  fetchImpl: FetchLike;
}) {
  const secretKey = tossSecretKey();
  if (!secretKey) throw new TossPaymentError("toss_not_configured");

  const authorization = Buffer.from(`${secretKey}:`).toString("base64");
  const response = await params.fetchImpl("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  const body = (await response.json()) as TossPaymentResponse & TossErrorResponse;
  if (!response.ok) {
    throw new TossPaymentError(
      "toss_confirm_failed",
      body.code ? `${body.code}: ${body.message ?? ""}`.trim() : body.message,
    );
  }
  if (
    body.paymentKey !== params.paymentKey ||
    body.orderId !== params.orderId ||
    (typeof body.totalAmount === "number" && body.totalAmount !== params.amount)
  ) {
    throw new TossPaymentError("toss_invalid_response");
  }
  return body;
}

export async function confirmTossPaymentIntent(params: {
  intentId: string;
  paymentKey: string;
  orderId: string;
  amount: number;
  fetchImpl?: FetchLike;
}) {
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new TossPaymentError("payment_intent_mismatch");
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`toss-intent:${params.intentId}`})::bigint)`);

    let [intent] = await tx.select().from(paymentTransactions).where(
      and(
        eq(paymentTransactions.id, params.intentId),
        eq(paymentTransactions.provider, TOSS_PROVIDER),
        eq(paymentTransactions.method, "card_online"),
      ),
    ).limit(1);

    if (!intent || !intent.paymentRequestId) throw new TossPaymentError("payment_intent_not_found");
    if (intent.status === "succeeded") {
      const metadata = (intent.metadata ?? {}) as Record<string, unknown>;
      return {
        bookingId: intent.bookingId,
        paymentKey: String(metadata.paymentKey ?? params.paymentKey),
        status: "succeeded" as const,
        alreadyConfirmed: true,
      };
    }
    if (intent.status !== "pending") throw new TossPaymentError("payment_intent_not_pending");
    if (intent.providerPaymentId !== params.orderId || intent.amount !== params.amount) {
      throw new TossPaymentError("payment_intent_mismatch");
    }

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment:${intent.paymentRequestId}`})::bigint)`);

    [intent] = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.id, params.intentId)).limit(1);
    if (!intent || !intent.paymentRequestId) throw new TossPaymentError("payment_intent_not_found");
    if (intent.status === "succeeded") {
      const metadata = (intent.metadata ?? {}) as Record<string, unknown>;
      return {
        bookingId: intent.bookingId,
        paymentKey: String(metadata.paymentKey ?? params.paymentKey),
        status: "succeeded" as const,
        alreadyConfirmed: true,
      };
    }
    if (intent.status !== "pending") throw new TossPaymentError("payment_intent_not_pending");

    const [request] = await tx.select().from(paymentRequests)
      .where(eq(paymentRequests.id, intent.paymentRequestId)).limit(1);
    if (!request || request.status === "cancelled") throw new TossPaymentError("payment_request_not_found");

    const paidRows = await tx.select({ type: paymentTransactions.type, amount: paymentTransactions.amount })
      .from(paymentTransactions).where(
        and(
          eq(paymentTransactions.paymentRequestId, request.id),
          eq(paymentTransactions.status, "succeeded"),
        ),
      );
    const currentNet = netPaid(paidRows);
    if (currentNet + intent.amount > request.amount) {
      throw new TossPaymentError("payment_amount_changed");
    }

    const payment = await confirmWithToss({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: intent.amount,
      idempotencyKey: intent.id,
      fetchImpl: params.fetchImpl ?? fetch,
    });

    const approvedAt = payment.approvedAt ? new Date(payment.approvedAt) : new Date();
    await tx.update(paymentTransactions).set({
      status: "succeeded",
      approvedAt,
      metadata: {
        orderId: params.orderId,
        paymentKey: payment.paymentKey,
        tossStatus: payment.status,
        method: payment.method,
        receiptUrl: payment.receipt?.url,
      },
    }).where(eq(paymentTransactions.id, intent.id));

    const nextNet = currentNet + intent.amount;
    const nextStatus = nextNet >= request.amount ? "paid" : "partially_paid";
    await tx.update(paymentRequests).set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(paymentRequests.id, request.id));

    return {
      bookingId: intent.bookingId,
      paymentKey: payment.paymentKey,
      status: "succeeded" as const,
      alreadyConfirmed: false,
    };
  });
}

export async function cancelTossPaymentIntent(params: {
  intentId: string;
  code?: string;
  message?: string;
}) {
  const [intent] = await db.select().from(paymentTransactions).where(
    and(
      eq(paymentTransactions.id, params.intentId),
      eq(paymentTransactions.provider, TOSS_PROVIDER),
    ),
  ).limit(1);
  if (!intent) throw new TossPaymentError("payment_intent_not_found");

  if (intent.status === "pending") {
    await db.update(paymentTransactions).set({
      status: "cancelled",
      metadata: {
        orderId: intent.providerPaymentId,
        failureCode: params.code,
        failureMessage: params.message,
      },
    }).where(eq(paymentTransactions.id, intent.id));
  }
  return { bookingId: intent.bookingId };
}

export async function getTossPaymentIntentContext(intentId: string) {
  const [intent] = await db.select({
    bookingId: paymentTransactions.bookingId,
    status: paymentTransactions.status,
  }).from(paymentTransactions).where(
    and(
      eq(paymentTransactions.id, intentId),
      eq(paymentTransactions.provider, TOSS_PROVIDER),
    ),
  ).limit(1);
  return intent ?? null;
}
