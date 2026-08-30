import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, bookingSpaces, scheduleBlocks } from "@/db/schema";
import {
  BookingConflictError,
  BookingValidationError,
} from "@/lib/booking/service";

export async function activateInquiryAsHold(params: {
  bookingId: string;
  holdExpiresAt: Date;
  setupMinutes?: number;
  teardownMinutes?: number;
}) {
  if (params.holdExpiresAt <= new Date()) {
    throw new BookingValidationError("hold_expiration_must_be_future");
  }

  const setupMinutes = params.setupMinutes ?? 0;
  const teardownMinutes = params.teardownMinutes ?? 0;

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`booking:${params.bookingId}`})::bigint)`,
    );

    const mappings = await tx
      .select({ spaceId: bookingSpaces.spaceId })
      .from(bookingSpaces)
      .where(eq(bookingSpaces.bookingId, params.bookingId));

    const spaceIds = mappings.map((row) => row.spaceId).sort();
    if (spaceIds.length === 0) {
      throw new BookingValidationError("invalid_space");
    }

    for (const spaceId of spaceIds) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`space:${spaceId}`})::bigint)`,
      );
    }

    const [booking] = await tx
      .select({
        id: bookings.id,
        venueId: bookings.venueId,
        title: bookings.title,
        status: bookings.status,
        eventStartsAt: bookings.eventStartsAt,
        eventEndsAt: bookings.eventEndsAt,
      })
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

    if (!booking) {
      throw new BookingValidationError("booking_not_found");
    }
    if (
      booking.status !== "inquiry" ||
      !booking.eventStartsAt ||
      !booking.eventEndsAt
    ) {
      throw new BookingValidationError("invalid_transition");
    }

    const eventStartsAt = booking.eventStartsAt;
    const eventEndsAt = booking.eventEndsAt;
    const blockedStartsAt = new Date(
      eventStartsAt.getTime() - setupMinutes * 60_000,
    );
    const blockedEndsAt = new Date(
      eventEndsAt.getTime() + teardownMinutes * 60_000,
    );

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
          inArray(scheduleBlocks.spaceId, spaceIds),
          eq(scheduleBlocks.isBlocking, true),
          isNull(scheduleBlocks.cancelledAt),
          lt(scheduleBlocks.startsAt, blockedEndsAt),
          gt(scheduleBlocks.endsAt, blockedStartsAt),
        ),
      );

    if (conflicts.length > 0) {
      throw new BookingConflictError(conflicts);
    }

    const blocks = spaceIds.flatMap((spaceId) => {
      const rows: Array<typeof scheduleBlocks.$inferInsert> = [];

      if (setupMinutes > 0) {
        rows.push({
          venueId: booking.venueId,
          spaceId,
          bookingId: booking.id,
          type: "setup",
          title: `${booking.title} / 준비`,
          startsAt: blockedStartsAt,
          endsAt: eventStartsAt,
        });
      }

      rows.push({
        venueId: booking.venueId,
        spaceId,
        bookingId: booking.id,
        type: "hold",
        title: booking.title,
        startsAt: eventStartsAt,
        endsAt: eventEndsAt,
        metadata: { holdExpiresAt: params.holdExpiresAt.toISOString() },
      });

      if (teardownMinutes > 0) {
        rows.push({
          venueId: booking.venueId,
          spaceId,
          bookingId: booking.id,
          type: "teardown",
          title: `${booking.title} / 철수`,
          startsAt: eventEndsAt,
          endsAt: blockedEndsAt,
        });
      }

      return rows;
    });

    await tx.insert(scheduleBlocks).values(blocks);

    const [updated] = await tx
      .update(bookings)
      .set({
        status: "hold",
        holdExpiresAt: params.holdExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    return updated;
  });
}
