import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BookingConflictError,
  createBooking,
} from "@/lib/booking/service";
import { verifyIntegrationSecret } from "@/lib/integrations/shared-secret";

const createBookingSchema = z.object({
  organizationId: z.string().uuid(),
  venueId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  ownerMemberId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(240),
  eventType: z.string().trim().max(120).optional(),
  status: z.enum(["hold", "tentative", "confirmed"]),
  customerName: z.string().trim().max(200).optional(),
  customerEmail: z.string().email().max(320).optional(),
  customerPhone: z.string().trim().max(60).optional(),
  attendeeCount: z.number().int().positive().max(100_000).optional(),
  spaceIds: z.array(z.string().uuid()).min(1).max(20),
  eventStartsAt: z.string().datetime({ offset: true }),
  eventEndsAt: z.string().datetime({ offset: true }),
  setupMinutes: z.number().int().min(0).max(24 * 60).optional(),
  teardownMinutes: z.number().int().min(0).max(24 * 60).optional(),
  holdExpiresAt: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(10_000).optional(),
});

export async function POST(request: Request) {
  try {
    if (!verifyIntegrationSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = createBookingSchema.parse(await request.json());

    if (payload.status === "hold" && !payload.holdExpiresAt) {
      return NextResponse.json(
        { error: "hold_expiration_required" },
        { status: 400 },
      );
    }

    const eventStartsAt = new Date(payload.eventStartsAt);
    const eventEndsAt = new Date(payload.eventEndsAt);

    if (eventStartsAt >= eventEndsAt) {
      return NextResponse.json(
        { error: "invalid_time_range", message: "eventEndsAt must be after eventStartsAt" },
        { status: 400 },
      );
    }

    const result = await createBooking({
      ...payload,
      eventStartsAt,
      eventEndsAt,
      holdExpiresAt: payload.holdExpiresAt
        ? new Date(payload.holdExpiresAt)
        : undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_request", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof BookingConflictError) {
      return NextResponse.json(
        { error: "schedule_conflict", conflicts: error.conflicts },
        { status: 409 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
