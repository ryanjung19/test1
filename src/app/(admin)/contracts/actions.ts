"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasAdminSession } from "@/lib/auth/admin-session";
import {
  ContractValidationError,
  saveContract,
  updateContractStatus,
} from "@/lib/contracts/service";

const saveSchema = z.object({
  bookingId: z.string().uuid(),
  documentUrl: z.string().trim().max(2_000),
  provider: z.string().trim().max(100),
  externalId: z.string().trim().max(255),
});

const statusSchema = z.object({
  contractId: z.string().uuid(),
  status: z.enum(["not_required", "draft", "sent", "signed", "cancelled"]),
});

async function requireAdmin() {
  if (!(await hasAdminSession())) redirect("/login");
}

function code(error: unknown) {
  if (error instanceof ContractValidationError) return error.code;
  if (error instanceof z.ZodError) return "invalid_request";
  return "internal_error";
}

export async function saveContractAction(formData: FormData) {
  await requireAdmin();
  let destination = "/contracts?updated=1";

  try {
    const payload = saveSchema.parse(Object.fromEntries(formData));
    const documentUrl = payload.documentUrl
      ? z.string().url().parse(payload.documentUrl)
      : undefined;

    await saveContract({
      bookingId: payload.bookingId,
      documentUrl,
      metadata:
        payload.provider || payload.externalId
          ? {
              provider: payload.provider || undefined,
              externalId: payload.externalId || undefined,
            }
          : undefined,
    });
  } catch (error) {
    destination = `/contracts?error=${encodeURIComponent(code(error))}`;
  }

  revalidatePath("/contracts");
  redirect(destination);
}

export async function updateContractStatusAction(formData: FormData) {
  await requireAdmin();
  let destination = "/contracts?updated=1";

  try {
    const payload = statusSchema.parse(Object.fromEntries(formData));
    await updateContractStatus(payload);
  } catch (error) {
    destination = `/contracts?error=${encodeURIComponent(code(error))}`;
  }

  revalidatePath("/contracts");
  redirect(destination);
}
