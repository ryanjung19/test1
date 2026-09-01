import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { scheduleBlocks } from "@/db/schema";
import { BookingConflictError } from "@/lib/booking/service";

export type ManualBlockType = "internal" | "maintenance";

export async function createManualScheduleBlock(params: {
  venueId: string;
  spaceIds: string[];
  type: ManualBlockType;
  title: string;
  startsAt: Date;
  endsAt: Date;
  note?: string;
}) {
  if (params.startsAt >= params.endsAt || params.spaceIds.length === 0) {
    throw new Error("invalid_manual_block");
  }

  const spaceIds = [...new Set(params.spaceIds)].sort();

  return db.transaction(async (tx) => {
    for (const spaceId of spaceIds) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`space:${spaceId}`})::bigint)`,
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
          inArray(scheduleBlocks.spaceId, spaceIds),
          eq(scheduleBlocks.isBlocking, true),
          isNull(scheduleBlocks.cancelledAt),
          lt(scheduleBlocks.startsAt, params.endsAt),
          gt(scheduleBlocks.endsAt, params.startsAt),
        ),
      );

    if (conflicts.length > 0) {
      throw new BookingConflictError(conflicts);
    }

    return tx
      .insert(scheduleBlocks)
      .values(
        spaceIds.map((spaceId) => ({
          venueId: params.venueId,
          spaceId,
          type: params.type,
          title: params.title,
          startsAt: params.startsAt,
          endsAt: params.endsAt,
          metadata: params.note ? { note: params.note } : undefined,
        })),
      )
      .returning();
  });
}

export async function cancelManualScheduleBlock(blockId: string) {
  return db.transaction(async (tx) => {
    const [block] = await tx
      .select({
        id: scheduleBlocks.id,
        spaceId: scheduleBlocks.spaceId,
        bookingId: scheduleBlocks.bookingId,
        type: scheduleBlocks.type,
        cancelledAt: scheduleBlocks.cancelledAt,
      })
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.id, blockId))
      .limit(1);

    if (!block || block.bookingId || !(["internal", "maintenance"] as string[]).includes(block.type)) {
      throw new Error("invalid_manual_block");
    }

    if (block.cancelledAt) return block;

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`space:${block.spaceId}`})::bigint)`,
    );

    const [updated] = await tx
      .update(scheduleBlocks)
      .set({ cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(scheduleBlocks.id, block.id))
      .returning();

    return updated;
  });
}
