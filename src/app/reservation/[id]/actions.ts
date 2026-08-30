"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyCustomerPortalToken } from "@/lib/auth/customer-portal";
import { acceptCustomerQuote, QuoteValidationError } from "@/lib/quotes/service";

const schema = z.object({
  bookingId: z.string().uuid(),
  quoteId: z.string().uuid(),
  token: z.string().min(10).max(4_000),
});

export async function acceptQuoteAction(formData: FormData) {
  let bookingId = String(formData.get("bookingId") ?? "");
  let token = String(formData.get("token") ?? "");
  let status = "accepted=1";

  try {
    const payload = schema.parse(Object.fromEntries(formData));
    bookingId = payload.bookingId;
    token = payload.token;

    if (!verifyCustomerPortalToken(bookingId, token)) {
      status = "error=invalid_link";
    } else {
      await acceptCustomerQuote({
        bookingId,
        quoteId: payload.quoteId,
      });
    }
  } catch (error) {
    const code = error instanceof QuoteValidationError ? error.code : "invalid_request";
    status = `error=${encodeURIComponent(code)}`;
  }

  revalidatePath(`/reservation/${bookingId}`);
  redirect(`/reservation/${bookingId}?token=${encodeURIComponent(token)}&${status}`);
}
