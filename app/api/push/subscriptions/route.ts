import { requireMember } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSubscription } from "@/lib/push/validation";
import { failure, json, readJson, requireSameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireMember();
    const subscription = parseSubscription(await readJson(request));
    const { data, error } = await createAdminClient().rpc("register_push", { p_user_id: user.id, p_endpoint: subscription.endpoint, p_p256dh: subscription.keys.p256dh, p_auth: subscription.keys.auth });
    if (error) return json({ error: "registration_unavailable" }, 409);
    return json({ registered: true, id: data }, 201);
  } catch (error) {
    if (error instanceof TypeError) return json({ error: "invalid_subscription" }, 400);
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user, supabase } = await requireMember();
    const subscription = parseSubscription(await readJson(request));
    const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", subscription.endpoint);
    if (error) throw error;
    return json({ removed: true });
  } catch (error) {
    if (error instanceof TypeError) return json({ error: "invalid_subscription" }, 400);
    return failure(error);
  }
}
