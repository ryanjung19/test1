import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecurringBillingAdapter } from "./adapter";

export async function processBillingEvent(inboxId: string, adapter: RecurringBillingAdapter) {
  const db = createAdminClient();
  const { data: event, error } = await db.from("billing_webhook_inbox").select("id,provider,payment_id,status").eq("id", inboxId).single();
  if (error) throw error;
  if (event.status === "processed" || event.status === "ignored") return event.status;
  if (event.provider !== adapter.provider) throw new Error("Provider mismatch");
  const verified = await adapter.getPayment(event.payment_id);
  if (verified.paymentId !== event.payment_id || !Number.isSafeInteger(verified.amount) || verified.amount <= 0 || !Number.isFinite(Date.parse(verified.updatedAt))) throw new Error("Invalid provider readback");
  const { data, error: applyError } = await db.rpc("apply_billing_payment", {
    p_inbox_id: inboxId, p_order_id: verified.orderId, p_store_id: verified.storeId,
    p_amount: verified.amount, p_currency: verified.currency, p_status: verified.status, p_verified_at: verified.updatedAt,
  });
  if (applyError) throw applyError;
  return data;
}
