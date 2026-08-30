import { and, eq, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { paymentRequests, paymentTransactions } from "@/db/schema";

type FetchLike = typeof fetch;

type TossCancel = {
  cancelAmount: number;
  cancelReason?: string;
  canceledAt?: string;
  transactionKey?: string;
  cancelStatus?: string;
};

type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt?: string;
  method?: string;
  receipt?: { url?: string } | null;
  cancels?: TossCancel[] | null;
};

type TossError = { code?: string; message?: string };

export class TossReconciliationError extends Error {
  constructor(
    public readonly code:
      | "toss_not_configured"
      | "toss_query_failed"
      | "toss_invalid_query_response"
      | "local_transaction_not_found"
      | "payment_amount_mismatch"
      | "provider_refund_less_than_local",
    public readonly providerMessage?: string,
  ) {
    super(providerMessage ? `${code}: ${providerMessage}` : code);
    this.name = "TossReconciliationError";
  }
}

function secretKey() {
  return process.env.TOSS_SECRET_KEY;
}

function originalTransactionId(metadata: Record<string, unknown> | null) {
  return typeof metadata?.originalTransactionId === "string"
    ? metadata.originalTransactionId
    : null;
}

async function queryTossPayment(paymentKey: string, fetchImpl: FetchLike) {
  const key = secretKey();
  if (!key) throw new TossReconciliationError("toss_not_configured");

  const authorization = Buffer.from(`${key}:`).toString("base64");
  const response = await fetchImpl(
    `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${authorization}` },
      cache: "no-store",
    },
  );
  const body = (await response.json()) as TossPayment & TossError;
  if (!response.ok) {
    throw new TossReconciliationError(
      "toss_query_failed",
      body.code ? `${body.code}: ${body.message ?? ""}`.trim() : body.message,
    );
  }
  if (
    body.paymentKey !== paymentKey ||
    !body.orderId ||
    !Number.isInteger(body.totalAmount) ||
    body.totalAmount <= 0
  ) {
    throw new TossReconciliationError("toss_invalid_query_response");
  }
  return body;
}

function providerCanceledAmount(payment: TossPayment) {
  return (payment.cancels ?? [])
    .filter((cancel) => cancel.cancelStatus === "DONE" || !cancel.cancelStatus)
    .reduce((sum, cancel) => sum + Math.max(cancel.cancelAmount || 0, 0), 0);
}

async function updatePaymentRequestStatus(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  paymentRequestId: string,
) {
  const [request] = await tx.select().from(paymentRequests)
    .where(eq(paymentRequests.id, paymentRequestId)).limit(1);
  if (!request) return;

  const succeeded = await tx.select({
    type: paymentTransactions.type,
    amount: paymentTransactions.amount,
  }).from(paymentTransactions).where(
    and(
      eq(paymentTransactions.paymentRequestId, paymentRequestId),
      eq(paymentTransactions.status, "succeeded"),
    ),
  );
  const net = succeeded.reduce(
    (sum, row) => sum + (row.type === "charge" ? row.amount : -row.amount),
    0,
  );
  const status = net >= request.amount
    ? "paid"
    : net > 0
      ? "partially_paid"
      : request.dueAt && request.dueAt < new Date()
        ? "overdue"
        : "pending";

  await tx.update(paymentRequests).set({ status, updatedAt: new Date() })
    .where(eq(paymentRequests.id, paymentRequestId));
}

export async function reconcileTossPayment(params: {
  paymentKey: string;
  fetchImpl?: FetchLike;
}) {
  const payment = await queryTossPayment(params.paymentKey, params.fetchImpl ?? fetch);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`toss-reconcile:${payment.paymentKey}`})::bigint)`,
    );

    const [charge] = await tx.select().from(paymentTransactions).where(
      and(
        eq(paymentTransactions.provider, "toss"),
        eq(paymentTransactions.method, "card_online"),
        eq(paymentTransactions.type, "charge"),
        or(
          eq(paymentTransactions.providerPaymentId, payment.orderId),
          sql`${paymentTransactions.metadata}->>'paymentKey' = ${payment.paymentKey}`,
        ),
      ),
    ).limit(1);

    if (!charge || !charge.paymentRequestId) {
      throw new TossReconciliationError("local_transaction_not_found");
    }
    if (charge.amount !== payment.totalAmount) {
      throw new TossReconciliationError("payment_amount_mismatch");
    }

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`payment:${charge.paymentRequestId}`})::bigint)`,
    );

    if (["DONE", "PARTIAL_CANCELED", "CANCELED"].includes(payment.status)) {
      await tx.update(paymentTransactions).set({
        status: "succeeded",
        approvedAt: payment.approvedAt ? new Date(payment.approvedAt) : charge.approvedAt ?? new Date(),
        metadata: {
          ...((charge.metadata ?? {}) as Record<string, unknown>),
          orderId: payment.orderId,
          paymentKey: payment.paymentKey,
          tossStatus: payment.status,
          method: payment.method,
          receiptUrl: payment.receipt?.url,
          lastReconciledAt: new Date().toISOString(),
        },
      }).where(eq(paymentTransactions.id, charge.id));
    } else if (["ABORTED", "EXPIRED"].includes(payment.status) && charge.status === "pending") {
      await tx.update(paymentTransactions).set({
        status: "failed",
        metadata: {
          ...((charge.metadata ?? {}) as Record<string, unknown>),
          orderId: payment.orderId,
          paymentKey: payment.paymentKey,
          tossStatus: payment.status,
          lastReconciledAt: new Date().toISOString(),
        },
      }).where(eq(paymentTransactions.id, charge.id));
    }

    const related = await tx.select().from(paymentTransactions)
      .where(eq(paymentTransactions.paymentRequestId, charge.paymentRequestId));
    const localRefunded = related.filter((row) => {
      if (row.type !== "refund" || row.status !== "succeeded" || row.provider !== "toss") return false;
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return originalTransactionId(metadata) === charge.id;
    }).reduce((sum, row) => sum + row.amount, 0);

    const providerRefunded = providerCanceledAmount(payment);
    if (providerRefunded < localRefunded) {
      throw new TossReconciliationError("provider_refund_less_than_local");
    }

    const refundDelta = providerRefunded - localRefunded;
    if (refundDelta > 0) {
      const newestCancel = [...(payment.cancels ?? [])].reverse().find(
        (cancel) => cancel.cancelStatus === "DONE" || !cancel.cancelStatus,
      );
      await tx.insert(paymentTransactions).values({
        bookingId: charge.bookingId,
        paymentRequestId: charge.paymentRequestId,
        type: "refund",
        method: "card_online",
        status: "succeeded",
        provider: "toss",
        providerPaymentId: payment.paymentKey,
        amount: refundDelta,
        approvedAt: newestCancel?.canceledAt ? new Date(newestCancel.canceledAt) : new Date(),
        metadata: {
          originalTransactionId: charge.id,
          paymentKey: payment.paymentKey,
          reconciliation: true,
          providerCanceledTotal: providerRefunded,
          cancelTransactionKey: newestCancel?.transactionKey,
          cancelReason: newestCancel?.cancelReason,
        },
      });
    }

    await updatePaymentRequestStatus(tx, charge.paymentRequestId);

    return {
      transactionId: charge.id,
      paymentStatus: payment.status,
      providerRefunded,
      reconciliationRefundAdded: refundDelta,
    };
  });
}
