import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, paymentRequests, paymentTransactions } from "@/db/schema";

type PaymentKind = "deposit" | "interim" | "balance" | "additional";
type ManualPaymentMethod = "bank_transfer" | "card_offline" | "cash" | "other";
type TransactionType = "charge" | "refund";

export class PaymentValidationError extends Error {
  constructor(
    public readonly code:
      | "booking_not_found"
      | "payment_request_not_found"
      | "invalid_amount"
      | "overpayment"
      | "refund_exceeds_paid",
  ) {
    super(code);
    this.name = "PaymentValidationError";
  }
}

export async function createPaymentRequest(params: {
  bookingId: string;
  kind: PaymentKind;
  amount: number;
  dueAt?: Date;
  memo?: string;
}) {
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new PaymentValidationError("invalid_amount");
  }

  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.id, params.bookingId))
    .limit(1);

  if (!booking) throw new PaymentValidationError("booking_not_found");

  const [request] = await db
    .insert(paymentRequests)
    .values({
      bookingId: params.bookingId,
      kind: params.kind,
      amount: params.amount,
      dueAt: params.dueAt,
      memo: params.memo,
    })
    .returning();

  return request;
}

export async function recordManualPaymentTransaction(params: {
  bookingId: string;
  paymentRequestId: string;
  type: TransactionType;
  method: ManualPaymentMethod;
  amount: number;
  approvedAt?: Date;
  reference?: string;
  memo?: string;
}) {
  if (!Number.isInteger(params.amount) || params.amount <= 0) {
    throw new PaymentValidationError("invalid_amount");
  }

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.id, params.paymentRequestId),
          eq(paymentRequests.bookingId, params.bookingId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new PaymentValidationError("payment_request_not_found");
    }

    const priorTransactions = await tx
      .select({
        type: paymentTransactions.type,
        amount: paymentTransactions.amount,
        status: paymentTransactions.status,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.paymentRequestId, request.id));

    const currentNet = priorTransactions
      .filter((item) => item.status === "succeeded")
      .reduce(
        (sum, item) => sum + (item.type === "charge" ? item.amount : -item.amount),
        0,
      );

    if (params.type === "charge" && currentNet + params.amount > request.amount) {
      throw new PaymentValidationError("overpayment");
    }
    if (params.type === "refund" && params.amount > currentNet) {
      throw new PaymentValidationError("refund_exceeds_paid");
    }

    const [transaction] = await tx
      .insert(paymentTransactions)
      .values({
        bookingId: params.bookingId,
        paymentRequestId: request.id,
        type: params.type,
        method: params.method,
        status: "succeeded",
        provider: params.method === "card_offline" ? "offline_terminal" : "manual",
        providerPaymentId: params.reference,
        amount: params.amount,
        approvedAt: params.approvedAt ?? new Date(),
        metadata: params.memo ? { memo: params.memo } : undefined,
      })
      .returning();

    const nextNet = currentNet + (params.type === "charge" ? params.amount : -params.amount);
    const nextStatus =
      nextNet >= request.amount
        ? "paid"
        : nextNet > 0
          ? "partially_paid"
          : request.dueAt && request.dueAt < new Date()
            ? "overdue"
            : "pending";

    await tx
      .update(paymentRequests)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(paymentRequests.id, request.id));

    return { transaction, netPaid: nextNet, requestAmount: request.amount, status: nextStatus };
  });
}
