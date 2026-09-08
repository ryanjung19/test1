import { createHash } from "node:crypto";
import * as PortOne from "@portone/server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { failure, json, readBody } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return json({ error: "webhook_unavailable" }, 503);
  let raw: string;
  try { raw = await readBody(request, 65536); } catch { return json({ error: "invalid_body" }, 400); }
  let event;
  try { event = await PortOne.Webhook.verify(secret, raw, Object.fromEntries(request.headers.entries())); }
  catch { return json({ error: "invalid_signature" }, 401); }
  const eventId = request.headers.get("webhook-id");
  if (!eventId || eventId.length > 256) return json({ error: "invalid_event_id" }, 400);
  if (!("data" in event) || !("paymentId" in event.data) || typeof event.data.paymentId !== "string") return json({ ignored: true }, 200);
  try {
    const { data, error } = await createAdminClient().rpc("receive_billing_event", {
      p_provider: "portone", p_event_id: eventId, p_type: event.type,
      p_payment_id: event.data.paymentId, p_hash: createHash("sha256").update(raw).digest("hex"),
    });
    if (error) throw error;
    return json({ accepted: true, receiptId: data, status: "pending_verification" }, 202);
  } catch (error) { return failure(error); }
}
