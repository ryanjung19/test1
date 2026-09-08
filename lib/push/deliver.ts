import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { WebPushSender, type PushSender } from "./sender";
import { parseSubscription } from "./validation";

export async function deliverMarketEvent(userId: string, eventId: string, sender: PushSender = new WebPushSender()) {
  const db = createAdminClient();
  const { data: event, error: eventError } = await db.from("market_events").select("id,event_type,stock_code,is_demo").eq("id", eventId).single();
  if (eventError) throw eventError;
  const { data: eligible, error: eligibilityError } = await db.rpc("can_deliver_push", { p_user_id: userId, p_event_type: event.event_type });
  if (eligibilityError) throw eligibilityError;
  if (!eligible) return { skipped: true, accepted: 0 };
  const { data: subscriptions, error } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth_secret").eq("user_id", userId);
  if (error) throw error;
  let accepted = 0;
  for (const subscription of subscriptions) {
    const { data: log, error: claimError } = await db.from("push_deliveries").insert({ user_id: userId, subscription_id: subscription.id, event_id: eventId }).select("id").single();
    if (claimError?.code === "23505") continue;
    if (claimError) throw claimError;
    let statusCode = 0;
    let status: "accepted" | "failed" | "expired" = "failed";
    try {
      const target = parseSubscription({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret } });
      const response = await sender.send(target, { title: `${event.is_demo ? "DEMO · " : ""}StockPulse`, body: `${event.stock_code} 시장 움직임이 감지되었습니다.`, url: "/app", eventId });
      statusCode = response.statusCode;
      if (statusCode >= 200 && statusCode < 300) { status = "accepted"; accepted++; }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") statusCode = error.statusCode;
    }
    if (statusCode === 404 || statusCode === 410) status = "expired";
    const { error: logError } = await db.from("push_deliveries").update({ status, provider_status: statusCode || null, accepted_at: status === "accepted" ? new Date().toISOString() : null }).eq("id", log.id);
    if (logError) throw logError;
    if (status === "expired") {
      const { error: deleteError } = await db.from("push_subscriptions").delete().eq("id", subscription.id);
      if (deleteError) throw deleteError;
    }
  }
  return { skipped: false, accepted };
}
