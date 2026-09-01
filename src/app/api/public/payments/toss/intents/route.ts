import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyCustomerPortalToken } from "@/lib/auth/customer-portal";
import {
  createTossPaymentIntent,
  TossPaymentError,
} from "@/lib/payments/toss-flow";

const schema = z.object({
  bookingId: z.string().uuid(),
  paymentRequestId: z.string().uuid(),
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    if (!verifyCustomerPortalToken(payload.bookingId, payload.token)) {
      return NextResponse.json({ error: "invalid_portal_token" }, { status: 401 });
    }

    const intent = await createTossPaymentIntent({
      bookingId: payload.bookingId,
      paymentRequestId: payload.paymentRequestId,
    });

    return NextResponse.json(intent, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof TossPaymentError) {
      const status = error.code === "toss_not_configured" ? 503 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
