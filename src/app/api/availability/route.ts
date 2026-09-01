import { NextResponse } from "next/server";
import { z } from "zod";

import { getScheduleConflicts } from "@/lib/booking/service";
import { verifyIntegrationSecret } from "@/lib/integrations/shared-secret";

const uuidListSchema = z.array(z.string().uuid()).min(1).max(20);
const datetimeSchema = z.string().datetime({ offset: true });

export async function GET(request: Request) {
  try {
    if (!verifyIntegrationSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceIds = uuidListSchema.parse(
      (searchParams.get("spaceIds") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const startsAt = new Date(datetimeSchema.parse(searchParams.get("from")));
    const endsAt = new Date(datetimeSchema.parse(searchParams.get("to")));

    if (startsAt >= endsAt) {
      return NextResponse.json(
        { error: "invalid_time_range", message: "to must be after from" },
        { status: 400 },
      );
    }

    const conflicts = await getScheduleConflicts({
      spaceIds,
      startsAt,
      endsAt,
    });

    return NextResponse.json({
      available: conflicts.length === 0,
      conflicts,
    });
  } catch (error) {
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
