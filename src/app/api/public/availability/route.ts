import { NextResponse } from "next/server";
import { z } from "zod";

import { isDatabaseConfigured } from "@/db";
import { getScheduleConflicts } from "@/lib/booking/service";
import {
  spaceIdsForCodes,
  VASSMENT_ONE,
  type VassmentSpaceCode,
} from "@/lib/vassment/constants";

const querySchema = z.object({
  spaces: z.string().min(1),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export async function GET(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "service_not_configured" },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const query = querySchema.parse({
      spaces: url.searchParams.get("spaces"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });

    const requestedCodes = [...new Set(query.spaces.split(","))];
    const allowedCodes = new Set<VassmentSpaceCode>(["1F", "B1"]);

    if (
      requestedCodes.length === 0 ||
      requestedCodes.length > 2 ||
      requestedCodes.some(
        (code) => !allowedCodes.has(code as VassmentSpaceCode),
      )
    ) {
      return NextResponse.json({ error: "invalid_space" }, { status: 400 });
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    const maxWindowMs = 48 * 60 * 60 * 1000;

    if (from >= to || to.getTime() - from.getTime() > maxWindowMs) {
      return NextResponse.json({ error: "invalid_time_range" }, { status: 400 });
    }

    const codes = requestedCodes as VassmentSpaceCode[];
    const spaceIds = spaceIdsForCodes(codes);
    const conflicts = await getScheduleConflicts({ spaceIds, startsAt: from, endsAt: to });
    const unavailableSpaceIds = new Set(conflicts.map((item) => item.spaceId));

    const spaces = Object.fromEntries(
      codes.map((code) => [
        code,
        !unavailableSpaceIds.has(VASSMENT_ONE.spaces[code]),
      ]),
    );

    return NextResponse.json(
      {
        available: Object.values(spaces).every(Boolean),
        spaces,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
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
