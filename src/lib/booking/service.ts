import { randomBytes } from "node:crypto";

import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  bookingSpaces,
  scheduleBlocks,
  type bookingStatusEnum,
} from "@/db/schema";

type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];

export type CreateBookingInput = {
  organizationId: string;
  venueId: string;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  ownerMemberId?: string;
  title: string;
  eventType?: string;
  status: Extract<BookingStatus, "hold" | "tentative" | "confirmed">;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  attendeeCount?: number;
  spaceIds: string[];
  eventStartsAt: Date;
  eventEndsAt: Date;
  setupMinutes?: number;
  teardownMinutes?: number;
  holdExpiresAt?: Date;
  notes?: string;
};

export type ScheduleConflict = {
  id: string;
  spaceId: string;
  bookingId: string | null;
  type: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
};

export class BookingConflictError extends Error {
  constructor(public readonly conflicts: ScheduleConflict[]) {
    super("The requested time overlaps an existing blocking schedule block.");
    this.name = "BookingConflictError";
  }
}

function assertBookingWindow(input: CreateBookingInput) {
  if (input.spaceIds.length === 0) {
    throw new Error("At least one space is required.");
  }

  if (input.eventStartsAt >= input.eventEndsAt) {
    throw new Error("eventEndsAt must be after eventStartsAt.");
  }

  if ((input.setupMinutes ?? 0) < 0 || (input.teardownMinutes ?? 0) < 0) {
    throw new Error("Setup and teardown minutes cannot be negative.");
  }

  if (input.status === "hold" && !input.holdExpiresAt) {
    throw new Error("holdExpiresAt is required for HOLD bookings.");
  }
}

function bookingNumberFor(eventStartsAt: Date) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(eventStartsAt)
    .replaceAll("-", "");

  return `BKG-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function getScheduleConflicts(params: {
  spaceIds: string[];
  startsAt: Date;
  endsAt: Date;
}) {
  if (params.spaceIds.length === 0) return [];

  return db
    .select({
      id: scheduleBlocks.id,
      spaceId: scheduleBlocks.spaceId,
      bookingId: scheduleBlocks.bookingId,
      type: scheduleBlocks.type,
      title: scheduleBlocks.title,
      startsAt: scheduleBlocks.startsAt,
      endsAt: scheduleBlocks.endsAt,
    })
    .from(scheduleBlocks)
    .where(
      and(
        inArray(scheduleBlocks.spaceId, params.spaceIds),
        eq(scheduleBlocks.isBlocking, true),
        isNull(scheduleBlocks.cancelledAt),
        lt(scheduleBlocks.startsAt, params.endsAt),
        gt(scheduleBlocks.endsAt, params.startsAt),
      ),
    )
    .orderBy(scheduleBlocks.startsAt);
}

export async function createBooking(input: CreateBookingInput) {
  assertBookingWindow(input);

  const uniqueSpaceIds = [...new Set(input.spaceIds)].sort();
  const setupMinutes = input.setupMinutes ?? 0;
  const teardownMinutes = input.teardownMinutes ?? 0;
  const blockedStartsAt = new Date(input.eventStartsAt.getTime() - setupMinutes * 60_000);
  const blockedEndsAt = new Date(input.eventEndsAt.getTime() + teardownMinutes * 60_000);

  return db.transaction(async (tx) => {
    // Serialize booking writes per space. Sorting prevents lock-order deadlocks when
    // one reservation spans B1 + 1F. This closes the race between conflict check
    // and insert without requiring a paid calendar component or external lock store.
    for (const spaceId of uniqueSpaceIds) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${spaceId})::bigint)`,
      );
    }

    const conflicts = await tx
      .select({
        id: scheduleBlocks.id,
        spaceId: scheduleBlocks.spaceId,
        bookingId: scheduleBlocks.bookingId,
        type: scheduleBlocks.type,
        title: scheduleBlocks.title,
        startsAt: scheduleBlocks.startsAt,
        endsAt: scheduleBlocks.endsAt,
      })
      .from(scheduleBlocks)
      .where(
        and(
          inArray(scheduleBlocks.spaceId, uniqueSpaceIds),
          eq(scheduleBlocks.isBlocking, true),
          isNull(scheduleBlocks.cancelledAt),
          lt(scheduleBlocks.startsAt, blockedEndsAt),
          gt(scheduleBlocks.endsAt, blockedStartsAt),
        ),
      )
      .orderBy(scheduleBlocks.startsAt);

    if (conflicts.length > 0) {
      throw new BookingConflictError(conflicts);
    }

    const [booking] = await tx
      .insert(bookings)
      .values({
        organizationId: input.organizationId,
        venueId: input.venueId,
        leadId: input.leadId,
        customerId: input.customerId,
        contactId: input.contactId,
        ownerMemberId: input.ownerMemberId,
        bookingNumber: bookingNumberFor(input.eventStartsAt),
        title: input.title,
        eventType: input.eventType,
        status: input.status,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        attendeeCount: input.attendeeCount,
        eventStartsAt: input.eventStartsAt,
        eventEndsAt: input.eventEndsAt,
        holdExpiresAt: input.holdExpiresAt,
        notes: input.notes,
      })
      .returning();

    await tx.insert(bookingSpaces).values(
      uniqueSpaceIds.map((spaceId) => ({
        bookingId: booking.id,
        spaceId,
      })),
    );

    const primaryType = input.status === "confirmed" ? "booking" : "hold";
    const blocks = uniqueSpaceIds.flatMap((spaceId) => {
      const rows: Array<typeof scheduleBlocks.$inferInsert> = [];

      if (setupMinutes > 0) {
        rows.push({
          venueId: input.venueId,
          spaceId,
          bookingId: booking.id,
          type: "setup",
          title: `${input.title} / 준비`,
          startsAt: blockedStartsAt,
          endsAt: input.eventStartsAt,
        });
      }

      rows.push({
        venueId: input.venueId,
        spaceId,
        bookingId: booking.id,
        type: primaryType,
        title: input.title,
        startsAt: input.eventStartsAt,
        endsAt: input.eventEndsAt,
        metadata:
          primaryType === "hold" && input.holdExpiresAt
            ? { holdExpiresAt: input.holdExpiresAt.toISOString() }
            : undefined,
      });

      if (teardownMinutes > 0) {
        rows.push({
          venueId: input.venueId,
          spaceId,
          bookingId: booking.id,
          type: "teardown",
          title: `${input.title} / 철수`,
          startsAt: input.eventEndsAt,
          endsAt: blockedEndsAt,
        });
      }

      return rows;
    });

    const insertedBlocks = await tx.insert(scheduleBlocks).values(blocks).returning();

    return {
      booking,
      blocks: insertedBlocks,
    };
  });
}
