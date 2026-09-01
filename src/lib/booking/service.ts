import { randomBytes } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  bookings,
  bookingSpaces,
  bookingStatusEnum,
  scheduleBlocks,
  spaces,
  venues,
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

export type BookingLifecycleAction =
  | "confirm"
  | "extend_hold"
  | "cancel"
  | "complete";

export class BookingConflictError extends Error {
  constructor(public readonly conflicts: ScheduleConflict[]) {
    super("The requested time overlaps an existing blocking schedule block.");
    this.name = "BookingConflictError";
  }
}

export class BookingValidationError extends Error {
  constructor(
    public readonly code:
      | "venue_not_found"
      | "invalid_space"
      | "booking_not_found"
      | "invalid_transition"
      | "hold_expiration_required"
      | "hold_expiration_must_be_future",
  ) {
    super(code);
    this.name = "BookingValidationError";
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
    throw new BookingValidationError("hold_expiration_required");
  }

  if (input.holdExpiresAt && input.holdExpiresAt <= new Date()) {
    throw new BookingValidationError("hold_expiration_must_be_future");
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

async function lockBookingAndSpaces(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  bookingId: string,
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`booking:${bookingId}`})::bigint)`,
  );

  const mappings = await tx
    .select({ spaceId: bookingSpaces.spaceId })
    .from(bookingSpaces)
    .where(eq(bookingSpaces.bookingId, bookingId));

  const spaceIds = mappings.map((row) => row.spaceId).sort();
  for (const spaceId of spaceIds) {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`space:${spaceId}`})::bigint)`,
    );
  }

  return spaceIds;
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

export async function listScheduleBlocks(params: {
  venueId: string;
  from: Date;
  to: Date;
}) {
  return db
    .select({
      id: scheduleBlocks.id,
      venueId: scheduleBlocks.venueId,
      spaceId: scheduleBlocks.spaceId,
      bookingId: scheduleBlocks.bookingId,
      type: scheduleBlocks.type,
      title: scheduleBlocks.title,
      startsAt: scheduleBlocks.startsAt,
      endsAt: scheduleBlocks.endsAt,
      isBlocking: scheduleBlocks.isBlocking,
    })
    .from(scheduleBlocks)
    .where(
      and(
        eq(scheduleBlocks.venueId, params.venueId),
        isNull(scheduleBlocks.cancelledAt),
        lt(scheduleBlocks.startsAt, params.to),
        gt(scheduleBlocks.endsAt, params.from),
      ),
    )
    .orderBy(asc(scheduleBlocks.startsAt));
}

export async function listBookings(params: {
  venueId: string;
  from?: Date;
  to?: Date;
  statuses?: BookingStatus[];
  limit?: number;
}) {
  const filters = [eq(bookings.venueId, params.venueId)];

  if (params.from) {
    filters.push(gt(bookings.eventEndsAt, params.from));
  }
  if (params.to) {
    filters.push(lt(bookings.eventStartsAt, params.to));
  }
  if (params.statuses && params.statuses.length > 0) {
    filters.push(inArray(bookings.status, params.statuses));
  }

  return db
    .select()
    .from(bookings)
    .where(and(...filters))
    .orderBy(desc(bookings.createdAt))
    .limit(Math.min(params.limit ?? 100, 500));
}

export async function createBooking(input: CreateBookingInput) {
  assertBookingWindow(input);

  const uniqueSpaceIds = [...new Set(input.spaceIds)].sort();
  const setupMinutes = input.setupMinutes ?? 0;
  const teardownMinutes = input.teardownMinutes ?? 0;
  const blockedStartsAt = new Date(
    input.eventStartsAt.getTime() - setupMinutes * 60_000,
  );
  const blockedEndsAt = new Date(
    input.eventEndsAt.getTime() + teardownMinutes * 60_000,
  );

  return db.transaction(async (tx) => {
    for (const spaceId of uniqueSpaceIds) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`space:${spaceId}`})::bigint)`,
      );
    }

    const [venue] = await tx
      .select({ id: venues.id })
      .from(venues)
      .where(
        and(
          eq(venues.id, input.venueId),
          eq(venues.organizationId, input.organizationId),
          eq(venues.active, true),
        ),
      )
      .limit(1);

    if (!venue) {
      throw new BookingValidationError("venue_not_found");
    }

    const validSpaces = await tx
      .select({ id: spaces.id })
      .from(spaces)
      .where(
        and(
          eq(spaces.venueId, input.venueId),
          eq(spaces.active, true),
          inArray(spaces.id, uniqueSpaceIds),
        ),
      );

    if (validSpaces.length !== uniqueSpaceIds.length) {
      throw new BookingValidationError("invalid_space");
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

    const insertedBlocks = await tx
      .insert(scheduleBlocks)
      .values(blocks)
      .returning();

    return {
      booking,
      blocks: insertedBlocks,
    };
  });
}

export async function transitionBooking(params: {
  bookingId: string;
  action: BookingLifecycleAction;
  holdExpiresAt?: Date;
}) {
  return db.transaction(async (tx) => {
    await lockBookingAndSpaces(tx, params.bookingId);

    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

    if (!booking) {
      throw new BookingValidationError("booking_not_found");
    }

    const now = new Date();

    if (params.action === "confirm") {
      if (!(["hold", "tentative"] as BookingStatus[]).includes(booking.status)) {
        throw new BookingValidationError("invalid_transition");
      }

      const [updated] = await tx
        .update(bookings)
        .set({
          status: "confirmed",
          holdExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(bookings.id, params.bookingId))
        .returning();

      await tx
        .update(scheduleBlocks)
        .set({ type: "booking", metadata: null })
        .where(
          and(
            eq(scheduleBlocks.bookingId, params.bookingId),
            eq(scheduleBlocks.type, "hold"),
            isNull(scheduleBlocks.cancelledAt),
          ),
        );

      return updated;
    }

    if (params.action === "extend_hold") {
      if (!(["hold", "tentative"] as BookingStatus[]).includes(booking.status)) {
        throw new BookingValidationError("invalid_transition");
      }
      if (!params.holdExpiresAt) {
        throw new BookingValidationError("hold_expiration_required");
      }
      if (params.holdExpiresAt <= now) {
        throw new BookingValidationError("hold_expiration_must_be_future");
      }

      const [updated] = await tx
        .update(bookings)
        .set({
          holdExpiresAt: params.holdExpiresAt,
          updatedAt: now,
        })
        .where(eq(bookings.id, params.bookingId))
        .returning();

      await tx
        .update(scheduleBlocks)
        .set({
          metadata: { holdExpiresAt: params.holdExpiresAt.toISOString() },
        })
        .where(
          and(
            eq(scheduleBlocks.bookingId, params.bookingId),
            eq(scheduleBlocks.type, "hold"),
            isNull(scheduleBlocks.cancelledAt),
          ),
        );

      return updated;
    }

    if (params.action === "cancel") {
      if (booking.status === "completed") {
        throw new BookingValidationError("invalid_transition");
      }
      if (booking.status === "cancelled") {
        return booking;
      }

      const [updated] = await tx
        .update(bookings)
        .set({
          status: "cancelled",
          holdExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(bookings.id, params.bookingId))
        .returning();

      await tx
        .update(scheduleBlocks)
        .set({ cancelledAt: now })
        .where(
          and(
            eq(scheduleBlocks.bookingId, params.bookingId),
            isNull(scheduleBlocks.cancelledAt),
          ),
        );

      return updated;
    }

    if (booking.status !== "confirmed") {
      throw new BookingValidationError("invalid_transition");
    }

    const [updated] = await tx
      .update(bookings)
      .set({ status: "completed", updatedAt: now })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    return updated;
  });
}

export async function expireDueHolds(params?: { limit?: number }) {
  const now = new Date();
  const due = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        inArray(bookings.status, ["hold", "tentative"]),
        lte(bookings.holdExpiresAt, now),
      ),
    )
    .orderBy(asc(bookings.holdExpiresAt))
    .limit(Math.min(params?.limit ?? 100, 500));

  const expired: string[] = [];

  for (const row of due) {
    const didExpire = await db.transaction(async (tx) => {
      await lockBookingAndSpaces(tx, row.id);

      const [booking] = await tx
        .select({
          id: bookings.id,
          status: bookings.status,
          holdExpiresAt: bookings.holdExpiresAt,
        })
        .from(bookings)
        .where(eq(bookings.id, row.id))
        .limit(1);

      if (
        !booking ||
        !(["hold", "tentative"] as BookingStatus[]).includes(booking.status) ||
        !booking.holdExpiresAt ||
        booking.holdExpiresAt > new Date()
      ) {
        return false;
      }

      const expiredAt = new Date();
      await tx
        .update(bookings)
        .set({
          status: "cancelled",
          holdExpiresAt: null,
          updatedAt: expiredAt,
        })
        .where(eq(bookings.id, row.id));

      await tx
        .update(scheduleBlocks)
        .set({ cancelledAt: expiredAt })
        .where(
          and(
            eq(scheduleBlocks.bookingId, row.id),
            isNull(scheduleBlocks.cancelledAt),
          ),
        );

      return true;
    });

    if (didExpire) expired.push(row.id);
  }

  return { expiredCount: expired.length, bookingIds: expired };
}
