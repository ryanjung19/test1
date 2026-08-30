import assert from "node:assert/strict";

import { eq } from "drizzle-orm";

import { db, pool } from "../src/db/index";
import { bookings, paymentRequests, scheduleBlocks } from "../src/db/schema";
import {
  BookingConflictError,
  createBooking,
  expireDueHolds,
  transitionBooking,
} from "../src/lib/booking/service";
import {
  createPaymentRequest,
  recordManualPaymentTransaction,
} from "../src/lib/payments/service";
import {
  confirmTossPaymentIntent,
  createTossPaymentIntent,
} from "../src/lib/payments/toss-flow";
import { refundTossOnlinePayment } from "../src/lib/payments/toss-refund";
import {
  convertProspectToLead,
  ingestProspects,
  reviewProspect,
} from "../src/lib/prospects/service";
import { VASSMENT_ONE } from "../src/lib/vassment/constants";

const oneHour = 60 * 60 * 1000;

async function expectConflict(work: () => Promise<unknown>) {
  let conflicted = false;
  try {
    await work();
  } catch (error) {
    if (error instanceof BookingConflictError) conflicted = true;
    else throw error;
  }
  assert.equal(conflicted, true, "overlapping reservation must be rejected");
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for integration smoke test");

  const eventStartsAt = new Date("2030-01-10T10:00:00+09:00");
  const eventEndsAt = new Date("2030-01-10T18:00:00+09:00");
  const holdExpiresAt = new Date("2030-01-05T18:00:00+09:00");

  const first = await createBooking({
    organizationId: VASSMENT_ONE.organizationId,
    venueId: VASSMENT_ONE.venueId,
    title: "CI Brand Launch",
    status: "hold",
    spaceIds: [VASSMENT_ONE.spaces["1F"]],
    eventStartsAt,
    eventEndsAt,
    setupMinutes: 60,
    teardownMinutes: 60,
    holdExpiresAt,
    customerName: "CI Customer",
  });
  assert.equal(first.booking.status, "hold");
  assert.equal(first.blocks.length, 3, "setup + event + teardown blocks expected");

  await expectConflict(() => createBooking({
    organizationId: VASSMENT_ONE.organizationId,
    venueId: VASSMENT_ONE.venueId,
    title: "Overlapping 1F Booking",
    status: "confirmed",
    spaceIds: [VASSMENT_ONE.spaces["1F"]],
    eventStartsAt: new Date(eventStartsAt.getTime() + oneHour),
    eventEndsAt: new Date(eventStartsAt.getTime() + 3 * oneHour),
  }));

  const independentSpace = await createBooking({
    organizationId: VASSMENT_ONE.organizationId,
    venueId: VASSMENT_ONE.venueId,
    title: "Parallel B1 Booking",
    status: "confirmed",
    spaceIds: [VASSMENT_ONE.spaces.B1],
    eventStartsAt: new Date(eventStartsAt.getTime() + oneHour),
    eventEndsAt: new Date(eventStartsAt.getTime() + 3 * oneHour),
  });
  assert.equal(independentSpace.booking.status, "confirmed");

  const confirmed = await transitionBooking({ bookingId: first.booking.id, action: "confirm" });
  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.holdExpiresAt, null);

  const request = await createPaymentRequest({
    bookingId: first.booking.id,
    kind: "deposit",
    amount: 1_000_000,
    dueAt: new Date("2029-12-31T18:00:00+09:00"),
  });

  const partial = await recordManualPaymentTransaction({
    bookingId: first.booking.id,
    paymentRequestId: request.id,
    type: "charge",
    method: "bank_transfer",
    amount: 400_000,
    reference: "CI-BANK-1",
  });
  assert.equal(partial.netPaid, 400_000);
  assert.equal(partial.status, "partially_paid");

  const paid = await recordManualPaymentTransaction({
    bookingId: first.booking.id,
    paymentRequestId: request.id,
    type: "charge",
    method: "card_offline",
    amount: 600_000,
    reference: "CI-CARD-1",
  });
  assert.equal(paid.netPaid, 1_000_000);
  assert.equal(paid.status, "paid");

  const refunded = await recordManualPaymentTransaction({
    bookingId: first.booking.id,
    paymentRequestId: request.id,
    type: "refund",
    method: "bank_transfer",
    amount: 100_000,
    reference: "CI-REFUND-1",
  });
  assert.equal(refunded.netPaid, 900_000);
  assert.equal(refunded.status, "partially_paid");

  const tossIntent = await createTossPaymentIntent({
    bookingId: first.booking.id,
    paymentRequestId: request.id,
  });
  assert.equal(tossIntent.amount, 100_000, "Toss intent must use server-computed outstanding amount");

  const tossConfirmed = await confirmTossPaymentIntent({
    intentId: tossIntent.intentId,
    paymentKey: "test-payment-key-ci",
    orderId: tossIntent.orderId,
    amount: tossIntent.amount,
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "https://api.tosspayments.com/v1/payments/confirm");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), `Basic ${Buffer.from("test_sk_ci:").toString("base64")}`);
      assert.equal(headers.get("Idempotency-Key"), tossIntent.intentId);
      const body = JSON.parse(String(init?.body)) as { paymentKey: string; orderId: string; amount: number };
      assert.deepEqual(body, { paymentKey: "test-payment-key-ci", orderId: tossIntent.orderId, amount: 100_000 });
      return new Response(JSON.stringify({
        paymentKey: "test-payment-key-ci",
        orderId: tossIntent.orderId,
        status: "DONE",
        totalAmount: 100_000,
        approvedAt: "2030-01-01T12:00:00+09:00",
        method: "카드",
        receipt: { url: "https://example.test/receipt" },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(tossConfirmed.status, "succeeded");

  const tossRefund = await refundTossOnlinePayment({
    transactionId: tossIntent.intentId,
    amount: 40_000,
    reason: "CI partial refund",
    fetchImpl: async (input, init) => {
      assert.equal(String(input), "https://api.tosspayments.com/v1/payments/test-payment-key-ci/cancel");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), `Basic ${Buffer.from("test_sk_ci:").toString("base64")}`);
      assert.ok(headers.get("Idempotency-Key"));
      const body = JSON.parse(String(init?.body)) as { cancelReason: string; cancelAmount: number };
      assert.deepEqual(body, { cancelReason: "CI partial refund", cancelAmount: 40_000 });
      return new Response(JSON.stringify({
        paymentKey: "test-payment-key-ci",
        status: "PARTIAL_CANCELED",
        cancels: [{
          cancelAmount: 40_000,
          cancelReason: "CI partial refund",
          canceledAt: "2030-01-02T12:00:00+09:00",
          transactionKey: "test-cancel-transaction-key",
          cancelStatus: "DONE",
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  assert.equal(tossRefund.status, "succeeded");
  const [requestAfterTossRefund] = await db.select({ status: paymentRequests.status })
    .from(paymentRequests).where(eq(paymentRequests.id, request.id));
  assert.equal(requestAfterTossRefund.status, "partially_paid");

  const ingested = await ingestProspects([
    { companyName: "CI Prospect Co", segment: "brand marketing", websiteUrl: "https://ci-prospect.example.com/", fitScore: 80, rationale: "Integration smoke test" },
    { companyName: "CI Prospect Co", segment: "brand marketing", websiteUrl: "https://ci-prospect.example.com", fitScore: 85, rationale: "Duplicate should upsert" },
  ]);
  assert.equal(ingested.length, 2);
  assert.equal(ingested[0].id, ingested[1].id, "prospect dedupe must upsert one row");

  const approved = await reviewProspect({ prospectId: ingested[0].id, status: "approved" });
  assert.equal(approved.status, "approved");
  const lead = await convertProspectToLead(ingested[0].id);
  assert.equal(lead.source, "outbound");
  assert.equal(lead.status, "new");

  let databaseConstraintBlockedOverlap = false;
  try {
    await db.insert(scheduleBlocks).values({
      venueId: VASSMENT_ONE.venueId,
      spaceId: VASSMENT_ONE.spaces["1F"],
      title: "Direct SQL overlap must fail",
      type: "internal",
      startsAt: new Date("2030-01-10T11:00:00+09:00"),
      endsAt: new Date("2030-01-10T12:00:00+09:00"),
    });
  } catch (error) {
    const pgCode = (error as { cause?: { code?: string }; code?: string }).cause?.code ?? (error as { code?: string }).code;
    databaseConstraintBlockedOverlap = pgCode === "23P01";
  }
  assert.equal(databaseConstraintBlockedOverlap, true, "PostgreSQL GiST exclusion constraint must reject direct overlapping writes");

  const expiring = await createBooking({
    organizationId: VASSMENT_ONE.organizationId,
    venueId: VASSMENT_ONE.venueId,
    title: "CI Expiring Hold",
    status: "hold",
    spaceIds: [VASSMENT_ONE.spaces.B1],
    eventStartsAt: new Date("2030-02-01T10:00:00+09:00"),
    eventEndsAt: new Date("2030-02-01T12:00:00+09:00"),
    holdExpiresAt: new Date("2030-01-20T18:00:00+09:00"),
  });
  await db.update(bookings).set({ holdExpiresAt: new Date(Date.now() - oneHour) }).where(eq(bookings.id, expiring.booking.id));
  const expired = await expireDueHolds({ limit: 20 });
  assert.ok(expired.bookingIds.includes(expiring.booking.id));
  const [expiredBooking] = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, expiring.booking.id));
  assert.equal(expiredBooking.status, "cancelled");

  console.log("Vassment One integration smoke test passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
