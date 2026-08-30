import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BookingValidationError,
  transitionBooking,
} from "@/lib/booking/service";
import { verifyIntegrationSecret } from "@/lib/integrations/shared-secret";

const lifecycleSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({
    action: z.literal("extend_hold"),
    holdExpiresAt: z.string().datetime({ offset: true }),
  }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("complete") }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!verifyIntegrationSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const bookingId = z.string().uuid().parse(id);
    const payload = lifecycleSchema.parse(await request.json());

    const booking = await transitionBooking({
      bookingId,
      action: payload.action,
      holdExpiresAt:
        payload.action === "extend_hold"
          ? new Date(payload.holdExpiresAt)
          : undefined,
    });

    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_request", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof BookingValidationError) {
      const status = error.code === "booking_not_found" ? 404 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }

    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
