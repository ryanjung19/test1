import { NextResponse } from "next/server";
import { z } from "zod";

import { isDatabaseConfigured } from "@/db";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/http/read-json-body";
import { createWebsiteInquiry } from "@/lib/inquiry/service";

const inquirySchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(5).max(60),
  eventType: z.string().trim().min(1).max(120),
  spaceCodes: z.array(z.enum(["1F", "B1"])).min(1).max(2),
  eventStartsAt: z.string().datetime({ offset: true }),
  eventEndsAt: z.string().datetime({ offset: true }),
  attendeeCount: z.number().int().positive().max(100_000).optional(),
  budgetBand: z.string().trim().max(80).optional(),
  message: z.string().trim().max(5_000).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "service_not_configured" },
        { status: 503 },
      );
    }

    const payload = inquirySchema.parse(await readJsonBody(request, 20_000));
    const eventStartsAt = new Date(payload.eventStartsAt);
    const eventEndsAt = new Date(payload.eventEndsAt);

    if (eventStartsAt >= eventEndsAt) {
      return NextResponse.json({ error: "invalid_time_range" }, { status: 400 });
    }

    const result = await createWebsiteInquiry({
      companyName: payload.companyName,
      contactName: payload.contactName,
      email: payload.email,
      phone: payload.phone,
      eventType: payload.eventType,
      spaceCodes: [...new Set(payload.spaceCodes)],
      eventStartsAt,
      eventEndsAt,
      attendeeCount: payload.attendeeCount,
      budgetBand: payload.budgetBand,
      message: payload.message,
    });

    return NextResponse.json(
      {
        status: "received",
        reference: result.booking.bookingNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "invalid_request", issues: error.issues },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
