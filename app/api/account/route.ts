import { requireMember } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { failure, json, readJson, requireSameOrigin } from "@/lib/http";

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user, supabase } = await requireMember();
    const body = await readJson(request, 1024);
    if (!body || typeof body !== "object" || !("confirmation" in body) || body.confirmation !== "DELETE") return json({ error: "confirmation_required" }, 400);
    const admin = createAdminClient();
    const { data, error } = await admin.from("subscriptions").select("id").eq("user_id", user.id).in("billing_status", ["active", "past_due", "cancel_at_period_end"]);
    if (error) throw error;
    if (data.length) return json({ error: "subscription_cancellation_required" }, 409);
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) throw deletionError;
    await supabase.auth.signOut();
    return json({ deleted: true, legalRecordsRetained: true });
  } catch (error) {
    if (error instanceof TypeError) return json({ error: "invalid_request" }, 400);
    return failure(error);
  }
}
