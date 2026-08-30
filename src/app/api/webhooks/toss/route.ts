import { NextResponse } from "next/server";
import { z } from "zod";

import {
  reconcileTossPayment,
  TossReconciliationError,
} from "@/lib/payments/toss-reconcile";

const webhookSchema = z.object({
  eventType: z.string(),
  createdAt: z.string().optional(),
  data: z.object({
    paymentKey: z.string().min(1),
  }).passthrough(),
}).passthrough();

export async function POST(request: Request) {
  try {
    const event = webhookSchema.parse(await request.json());

    if (event.eventType !== "PAYMENT_STATUS_CHANGED") {
      return NextResponse.json({ status: "ignored" });
    }

    const result = await reconcileTossPayment({
      paymentKey: event.data.paymentKey,
    });

    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
    }

    if (
      error instanceof TossReconciliationError &&
      error.code === "local_transaction_not_found"
    ) {
      // The merchant account can have unrelated/legacy payments. A verified Toss
      // payment that is not part of this Booking OS should not trigger retries.
      return NextResponse.json({ status: "ignored", reason: error.code });
    }

    console.error(error);
    return NextResponse.json({ error: "reconciliation_failed" }, { status: 500 });
  }
}
