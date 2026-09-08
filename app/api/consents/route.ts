import { randomUUID } from "node:crypto";
import { requireMember } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { consentDocument } from "@/lib/consent/documents";
import { failure, json, readJson, requireSameOrigin } from "@/lib/http";

export async function GET() {
  try {
    const { supabase } = await requireMember();
    const { data, error } = await supabase.rpc("my_consents");
    if (error) throw error;
    return json({ receipts: data });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireMember();
    const body = await readJson(request);
    if (!body || typeof body !== "object" || !("type" in body) || typeof body.type !== "string" || !("version" in body) || !("action" in body)) return json({ error: "invalid_receipt" }, 400);
    const document = consentDocument(body.type);
    if (body.version !== document.version) return json({ error: "document_changed" }, 409);
    if (body.action !== "accept" && body.action !== "withdraw") return json({ error: "invalid_action" }, 400);
    const prior = "priorId" in body && typeof body.priorId === "string" ? body.priorId : null;
    if (body.action === "withdraw" && (!prior || !/^[0-9a-f-]{36}$/i.test(prior))) return json({ error: "prior_receipt_required" }, 400);
    const { data, error } = await createAdminClient().rpc("record_consent", {
      p_user_id: user.id, p_type: document.type, p_version: document.version, p_hash: document.hash,
      p_action: body.action, p_prior_id: prior,
      p_context: { request_id: randomUUID(), action: `consent.${body.action}`, source: "account", service: "stockpulse" },
    });
    if (error) throw error;
    return json({ receiptId: data, documentVersion: document.version, documentHash: document.hash }, 201);
  } catch (error) {
    if (error instanceof TypeError) return json({ error: "invalid_request" }, 400);
    return failure(error);
  }
}
