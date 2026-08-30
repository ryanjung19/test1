"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  cancelManualScheduleBlock,
  createManualScheduleBlock,
} from "@/lib/booking/manual-block";
import { BookingConflictError } from "@/lib/booking/service";
import {
  spaceIdsForCodes,
  VASSMENT_ONE,
  type VassmentSpaceCode,
} from "@/lib/vassment/constants";

const schema = z.object({
  title: z.string().trim().min(1).max(240),
  type: z.enum(["internal", "maintenance"]),
  space: z.enum(["1F", "B1", "ALL"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  note: z.string().trim().max(5_000),
});

function datePlusDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

async function requireAdmin() {
  if (!(await hasAdminSession())) redirect("/login");
}

export async function createManualBlockAction(formData: FormData) {
  await requireAdmin();
  let destination = "/calendar?created=1";

  try {
    const payload = schema.parse(Object.fromEntries(formData));
    const endDate = payload.endTime <= payload.startTime ? datePlusDays(payload.date, 1) : payload.date;
    const spaceCodes: VassmentSpaceCode[] =
      payload.space === "ALL" ? ["1F", "B1"] : [payload.space];

    await createManualScheduleBlock({
      venueId: VASSMENT_ONE.venueId,
      spaceIds: spaceIdsForCodes(spaceCodes),
      type: payload.type,
      title: payload.title,
      startsAt: new Date(`${payload.date}T${payload.startTime}:00+09:00`),
      endsAt: new Date(`${endDate}T${payload.endTime}:00+09:00`),
      note: payload.note || undefined,
    });
  } catch (error) {
    destination = `/calendar?error=${error instanceof BookingConflictError ? "schedule_conflict" : "invalid_request"}`;
  }

  revalidatePath("/calendar");
  redirect(destination);
}

export async function cancelManualBlockAction(formData: FormData) {
  await requireAdmin();
  let destination = "/calendar?updated=1";

  try {
    const blockId = z.string().uuid().parse(formData.get("blockId"));
    await cancelManualScheduleBlock(blockId);
  } catch {
    destination = "/calendar?error=invalid_request";
  }

  revalidatePath("/calendar");
  redirect(destination);
}
