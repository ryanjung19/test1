"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  BookingConflictError,
  BookingValidationError,
  createBooking,
  transitionBooking,
  type BookingLifecycleAction,
} from "@/lib/booking/service";
import {
  spaceIdsForCodes,
  VASSMENT_ONE,
  type VassmentSpaceCode,
} from "@/lib/vassment/constants";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  title: z.string().trim().min(1).max(240),
  customerName: z.string().trim().max(200),
  customerEmail: z.string().trim().max(320),
  customerPhone: z.string().trim().max(60),
  eventType: z.string().trim().max(120),
  space: z.enum(["1F", "B1", "ALL"]),
  date: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
  setupMinutes: z.coerce.number().int().min(0).max(24 * 60),
  teardownMinutes: z.coerce.number().int().min(0).max(24 * 60),
  attendeeCount: z.string().trim().max(10),
  status: z.enum(["hold", "tentative", "confirmed"]),
  holdExpiresAt: z.string().trim().max(40),
  notes: z.string().trim().max(10_000),
});

const lifecycleSchema = z.object({
  bookingId: z.string().uuid(),
  action: z.enum(["confirm", "extend_hold", "cancel", "complete"]),
  holdExpiresAt: z.string().trim().max(40).optional(),
});

function datePlusDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function seoulRange(date: string, startTime: string, endTime: string) {
  const endDate = endTime <= startTime ? datePlusDays(date, 1) : date;
  return {
    startsAt: new Date(`${date}T${startTime}:00+09:00`),
    endsAt: new Date(`${endDate}T${endTime}:00+09:00`),
  };
}

function seoulLocalInput(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${normalized}+09:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function errorCode(error: unknown) {
  if (error instanceof BookingConflictError) return "schedule_conflict";
  if (error instanceof BookingValidationError) return error.code;
  if (error instanceof z.ZodError) return "invalid_request";
  return "internal_error";
}

async function requireAdmin() {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }
}

export async function createAdminBookingAction(formData: FormData) {
  await requireAdmin();
  let destination = "/bookings?created=1";

  try {
    const payload = createSchema.parse(Object.fromEntries(formData));
    const range = seoulRange(payload.date, payload.startTime, payload.endTime);
    const holdExpiresAt = seoulLocalInput(payload.holdExpiresAt);

    if ((payload.status === "hold" || payload.status === "tentative") && !holdExpiresAt) {
      throw new BookingValidationError("hold_expiration_required");
    }

    const spaceCodes: VassmentSpaceCode[] =
      payload.space === "ALL" ? ["1F", "B1"] : [payload.space];

    await createBooking({
      organizationId: VASSMENT_ONE.organizationId,
      venueId: VASSMENT_ONE.venueId,
      title: payload.title,
      customerName: payload.customerName || undefined,
      customerEmail: payload.customerEmail || undefined,
      customerPhone: payload.customerPhone || undefined,
      eventType: payload.eventType || undefined,
      attendeeCount: payload.attendeeCount ? Number(payload.attendeeCount) : undefined,
      status: payload.status,
      spaceIds: spaceIdsForCodes(spaceCodes),
      eventStartsAt: range.startsAt,
      eventEndsAt: range.endsAt,
      setupMinutes: payload.setupMinutes,
      teardownMinutes: payload.teardownMinutes,
      holdExpiresAt,
      notes: payload.notes || undefined,
    });
  } catch (error) {
    destination = `/bookings?error=${encodeURIComponent(errorCode(error))}`;
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  redirect(destination);
}

export async function bookingLifecycleAction(formData: FormData) {
  await requireAdmin();
  let destination = "/bookings?updated=1";

  try {
    const payload = lifecycleSchema.parse(Object.fromEntries(formData));
    const action = payload.action as BookingLifecycleAction;
    const holdExpiresAt =
      action === "extend_hold" ? seoulLocalInput(payload.holdExpiresAt ?? "") : undefined;

    await transitionBooking({
      bookingId: payload.bookingId,
      action,
      holdExpiresAt,
    });
  } catch (error) {
    destination = `/bookings?error=${encodeURIComponent(errorCode(error))}`;
  }

  revalidatePath("/bookings");
  revalidatePath("/calendar");
  redirect(destination);
}
