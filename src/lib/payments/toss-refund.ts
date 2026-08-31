import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentRequests, paymentTransactions } from "@/db/schema";
import { tossKeys } from "@/lib/config/secrets";

type FetchLike = typeof fetch;

type TossCancelResponse = {
  paymentKey: string;
  status: string;
  cancels?: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
    transactionKey: string;
    cancelStatus: string;
  }> | null;
};

type TossError = { code?: string; message?: string };

export class TossRefundError extends Error {
  constructor(
    public readonly code:
      | "toss_not_configured"
      | "online_charge_not_found"
      | "payment_key_not_found"
      | "invalid_refund_amount"
      | "refund_exceeds_charge"
      | "refund_intent_not_found"
      | "refund_not_pending"
      | "toss_cancel_failed"
      | "toss_invalid_cancel_response",
    public readonly providerMessage?: string,
  ) {
    super(providerMessage ? `${code}: ${providerMessage}` : code);
    this.name = "TossRefundError";
  }
}

function secretKey() {
  return tossKeys()?.secretKey;
}

function originalId(metadata: Record<string, unknown> | null) {
  return typeof metadata?.originalTransactionId === "string"
    ? metadata.originalTransactionId
    : null;
}

async function createOrReuseRefundIntent(params: {
  transactionId: string;
  amount: number;
  reason: string;
}) {
  if (!Number.isInteger(params.amount) || params.amount <= 0 || !params.reason.trim()) {
    throw new TossRefundError("invalid_refund_amount");
  }
  if (!secretKey()) throw new TossRefundError("toss_not_configured");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`toss-charge:${params.transactionId}`})::bigint)`);

    const [charge] = await tx.select().from(paymentTransactions).where(
      and(
        eq(paymentTransactions.id, params.transactionId),
        eq(paymentTransactions.provider, "toss"),
        eq(paymentTransactions.method, "card_online"),
        eq(paymentTransactions.type, "charge"),
        eq(paymentTransactions.status, "succeeded"),
      ),
    ).limit(1);

    if (!charge || !charge.paymentRequestId) throw new TossRefundError("online_charge_not_found");
    const chargeMetadata = (charge.metadata ?? {}) as Record<string, unknown>;
    const paymentKey = typeof chargeMetadata.paymentKey === "string" ? chargeMetadata.paymentKey : null;
    if (!paymentKey) throw new TossRefundError("payment_key_not_found");

    const related = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.paymentRequestId, charge.paymentRequestId));

    const refunds = related.filter((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return row.type === "refund" && row.method === "card_online" && row.provider === "toss" && originalId(metadata) === charge.id;
    });
    const refunded = refunds
      .filter((row) => row.status === "succeeded")
      .reduce((sum, row) => sum + row.amount, 0);
    if (refunded + params.amount > charge.amount) throw new TossRefundError("refund_exceeds_charge");

    const reusable = refunds.find((row) => row.status === "pending" && row.amount === params.amount);
    if (reusable) return { refundIntent: reusable, paymentKey };

    const [refundIntent] = await tx.insert(paymentTransactions).values({
      bookingId: charge.bookingId,
      paymentRequestId: charge.paymentRequestId,
      type: "refund",
      method: "card_online",
      status: "pending",
      provider: "toss",
      providerPaymentId: paymentKey,
      amount: params.amount,
      metadata: {
        originalTransactionId: charge.id,
        paymentKey,
        cancelReason: params.reason.trim().slice(0, 200),
      },
    }).returning();

    return { refundIntent, paymentKey };
  });
}

async function cancelWithToss(params: {
  paymentKey: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  fetchImpl: FetchLike;
}) {
  const key = secretKey();
  if (!key) throw new TossRefundError("toss_not_configured");
  const authorization = Buffer.from(`${key}:`).toString("base64");
  const response = await params.fetchImpl(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(params.paymentKey)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify({
        cancelReason: params.reason,
        cancelAmount: params.amount,
      }),
    },
  );
  const body = (await response.json()) as TossCancelResponse & TossError;
  if (!response.ok) {
    throw new TossRefundError(
      "toss_cancel_failed",
      body.code ? `${body.code}: ${body.message ?? ""}`.trim() : body.message,
    );
  }
  if (body.paymentKey !== params.paymentKey) throw new TossRefundError("toss_invalid_cancel_response");
  const cancel = [...(body.cancels ?? [])].reverse().find(
    (item) => item.cancelAmount === params.amount && item.cancelStatus === "DONE",
  );
  if (!cancel) throw new TossRefundError("toss_invalid_cancel_response");
  return { body, cancel };
}

async function executeRefundIntent(params: {
  refundIntentId: string;
  fetchImpl?: FetchLike;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`toss-refund:${params.refundIntentId}`})::bigint)`);

    const [refund] = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.id, params.refundIntentId)).limit(1);
    if (!refund || refund.type !== "refund" || refund.provider !== "toss" || refund.method !== "card_online" || !refund.paymentRequestId) {
      throw new TossRefundError("refund_intent_not_found");
    }
    if (refund.status === "succeeded") return refund;
    if (refund.status !== "pending") throw new TossRefundError("refund_not_pending");

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment:${refund.paymentRequestId}`})::bigint)`);
    const metadata = (refund.metadata ?? {}) as Record<string, unknown>;
    const paymentKey = typeof metadata.paymentKey === "string" ? metadata.paymentKey : null;
    const sourceId = originalId(metadata);
    const reason = typeof metadata.cancelReason === "string" ? metadata.cancelReason : "Vassment One refund";
    if (!paymentKey || !sourceId) throw new TossRefundError("payment_key_not_found");

    const [source] = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.id, sourceId)).limit(1);
    if (!source || source.status !== "succeeded" || source.type !== "charge") throw new TossRefundError("online_charge_not_found");

    const related = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.paymentRequestId, refund.paymentRequestId));
    const priorRefunded = related.filter((row) => {
      const rowMetadata = (row.metadata ?? {}) as Record<string, unknown>;
      return row.id !== refund.id && row.status === "succeeded" && row.type === "refund" && originalId(rowMetadata) === source.id;
    }).reduce((sum, row) => sum + row.amount, 0);
    if (priorRefunded + refund.amount > source.amount) throw new TossRefundError("refund_exceeds_charge");

    const result = await cancelWithToss({
      paymentKey,
      amount: refund.amount,
      reason,
      idempotencyKey: refund.id,
      fetchImpl: params.fetchImpl ?? fetch,
    });

    const approvedAt = new Date(result.cancel.canceledAt);
    await tx.update(paymentTransactions).set({
      status: "succeeded",
      approvedAt,
      metadata: {
        originalTransactionId: source.id,
        paymentKey,
        cancelReason: result.cancel.cancelReason,
        cancelTransactionKey: result.cancel.transactionKey,
        tossStatus: result.body.status,
      },
    }).where(eq(paymentTransactions.id, refund.id));

    const [request] = await tx.select().from(paymentRequests)
      .where(eq(paymentRequests.id, refund.paymentRequestId)).limit(1);
    if (request) {
      const succeeded = related.filter((row) => row.status === "succeeded");
      const currentNet = succeeded.reduce(
        (sum, row) => sum + (row.type === "charge" ? row.amount : -row.amount),
        0,
      );
      const nextNet = currentNet - refund.amount;
      const nextStatus = nextNet >= request.amount
        ? "paid"
        : nextNet > 0
          ? "partially_paid"
          : request.dueAt && request.dueAt < new Date()
            ? "overdue"
            : "pending";
      await tx.update(paymentRequests).set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(paymentRequests.id, request.id));
    }

    return { ...refund, status: "succeeded" as const, approvedAt };
  });
}

export async function refundTossOnlinePayment(params: {
  transactionId: string;
  amount: number;
  reason: string;
  fetchImpl?: FetchLike;
}) {
  const { refundIntent } = await createOrReuseRefundIntent(params);
  return executeRefundIntent({ refundIntentId: refundIntent.id, fetchImpl: params.fetchImpl });
}
