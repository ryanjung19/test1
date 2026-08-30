import assert from "node:assert/strict";

import { and, eq } from "drizzle-orm";

import { db, pool } from "../src/db/index";
import { paymentRequests, paymentTransactions } from "../src/db/schema";
import { reconcileTossPayment } from "../src/lib/payments/toss-reconcile";

async function main() {
  const [charge] = await db.select().from(paymentTransactions).where(
    and(
      eq(paymentTransactions.provider, "toss"),
      eq(paymentTransactions.method, "card_online"),
      eq(paymentTransactions.type, "charge"),
      eq(paymentTransactions.status, "succeeded"),
    ),
  ).limit(1);

  assert.ok(charge?.paymentRequestId, "prior Toss smoke charge is required");
  const metadata = (charge.metadata ?? {}) as Record<string, unknown>;
  assert.equal(metadata.paymentKey, "test-payment-key-ci");

  const queryResponse = () => new Response(JSON.stringify({
    paymentKey: "test-payment-key-ci",
    orderId: charge.providerPaymentId,
    status: "PARTIAL_CANCELED",
    totalAmount: charge.amount,
    approvedAt: "2030-01-01T12:00:00+09:00",
    method: "카드",
    receipt: { url: "https://example.test/receipt" },
    cancels: [
      {
        cancelAmount: 40_000,
        cancelReason: "CI partial refund",
        canceledAt: "2030-01-02T12:00:00+09:00",
        transactionKey: "test-cancel-transaction-key-1",
        cancelStatus: "DONE",
      },
      {
        cancelAmount: 30_000,
        cancelReason: "External dashboard refund",
        canceledAt: "2030-01-03T12:00:00+09:00",
        transactionKey: "test-cancel-transaction-key-2",
        cancelStatus: "DONE",
      },
    ],
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  const first = await reconcileTossPayment({
    paymentKey: "test-payment-key-ci",
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "https://api.tosspayments.com/v1/payments/test-payment-key-ci");
      assert.equal(init?.method, "GET");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), `Basic ${Buffer.from("test_sk_ci:").toString("base64")}`);
      return queryResponse();
    },
  });

  assert.equal(first.providerRefunded, 70_000);
  assert.equal(first.reconciliationRefundAdded, 30_000);

  const second = await reconcileTossPayment({
    paymentKey: "test-payment-key-ci",
    fetchImpl: async () => queryResponse(),
  });
  assert.equal(second.reconciliationRefundAdded, 0, "reconciliation must be idempotent");

  const rows = await db.select().from(paymentTransactions)
    .where(eq(paymentTransactions.paymentRequestId, charge.paymentRequestId));
  const refundsForCharge = rows.filter((row) => {
    if (row.type !== "refund" || row.status !== "succeeded" || row.provider !== "toss") return false;
    const rowMetadata = (row.metadata ?? {}) as Record<string, unknown>;
    return rowMetadata.originalTransactionId === charge.id;
  });
  assert.equal(refundsForCharge.reduce((sum, row) => sum + row.amount, 0), 70_000);

  const [request] = await db.select({ status: paymentRequests.status })
    .from(paymentRequests).where(eq(paymentRequests.id, charge.paymentRequestId)).limit(1);
  assert.equal(request.status, "partially_paid");

  console.log("Toss webhook reconciliation smoke test passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
