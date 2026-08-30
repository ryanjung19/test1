import { randomBytes } from "node:crypto";

import { db } from "@/db";
import { bookings, bookingSpaces, leads } from "@/db/schema";
import {
  spaceIdsForCodes,
  VASSMENT_ONE,
  type VassmentSpaceCode,
} from "@/lib/vassment/constants";

export type CreateWebsiteInquiryInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  eventType: string;
  spaceCodes: VassmentSpaceCode[];
  eventStartsAt: Date;
  eventEndsAt: Date;
  attendeeCount?: number;
  budgetBand?: string;
  message?: string;
};

function inquiryNumberFor(eventStartsAt: Date) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(eventStartsAt)
    .replaceAll("-", "");

  return `INQ-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createWebsiteInquiry(input: CreateWebsiteInquiryInput) {
  if (input.eventStartsAt >= input.eventEndsAt) {
    throw new Error("eventEndsAt must be after eventStartsAt");
  }

  const spaceIds = spaceIdsForCodes(input.spaceCodes);
  const notes = [
    `담당자: ${input.contactName}`,
    input.budgetBand ? `예산 구간: ${input.budgetBand}` : null,
    input.message ? `문의 내용: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(leads)
      .values({
        organizationId: VASSMENT_ONE.organizationId,
        venueId: VASSMENT_ONE.venueId,
        title: `${input.companyName} / ${input.eventType}`,
        segment: input.eventType,
        source: "website",
        status: "new",
        eventDateFrom: input.eventStartsAt,
        eventDateTo: input.eventEndsAt,
        notes,
      })
      .returning();

    const [booking] = await tx
      .insert(bookings)
      .values({
        organizationId: VASSMENT_ONE.organizationId,
        venueId: VASSMENT_ONE.venueId,
        leadId: lead.id,
        bookingNumber: inquiryNumberFor(input.eventStartsAt),
        title: `${input.companyName} / ${input.eventType}`,
        eventType: input.eventType,
        status: "inquiry",
        customerName: input.companyName,
        customerEmail: input.email,
        customerPhone: input.phone,
        attendeeCount: input.attendeeCount,
        eventStartsAt: input.eventStartsAt,
        eventEndsAt: input.eventEndsAt,
        notes,
      })
      .returning();

    await tx.insert(bookingSpaces).values(
      spaceIds.map((spaceId) => ({
        bookingId: booking.id,
        spaceId,
      })),
    );

    return { lead, booking };
  });
}
