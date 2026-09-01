import { NextResponse } from "next/server";
import { z } from "zod";

import {
  reconcileTossPayment,
  TossReconciliationError,
} from "@/lib/payments/toss-reconcile";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/http/read-json-body";

const envelopeSchema = z.object({
  eventType: z.string(),
  createdAt: z.string().optional(),
  data: z.unknown(),
}).passthrough();

const paymentDataSchema = z.object({
  paymentKey: z.string().min(1).max(200),
}).passthrough();

export async function POST(request: Request) {
  try {
    const event = envelopeSchema.parse(await readJsonBody(request, 32_000));

    if (event.eventType !== "PAYMENT_STATUS_CHANGED") {
      return NextResponse.json({ status: "ignored" });
    }

    const data = paymentDataSchema.parse(event.data);
    const result = await reconcileTossPayment({ paymentKey: data.paymentKey });

    return NextResponse.json({ status: "ok", result });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
    }

    if (
      error instanceof TossReconciliationError &&
      error.code === "local_transaction_not_found"
    ) {
      // The same Toss merchant account can contain unrelated or legacy payments.
      // Once Toss itself verified the payment, an unknown local transaction should
      // not create an endless webhook retry loop.
      return NextResponse.json({ status: "ignored", reason: error.code });
    }

    console.error(error);
    return NextResponse.json({ error: "reconciliation_failed" }, { status: 500 });
  }
}
