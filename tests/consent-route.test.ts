import { afterEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/consents/route";
import { consentDocument } from "@/lib/consent/documents";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/auth/access", async (original) => ({ ...await original<typeof import("@/lib/auth/access")>(), requireMember: async () => ({ user: { id: "verified-member" } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
afterEach(() => vi.resetAllMocks());
function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/consents", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
test("consent uses authenticated identity and server hash/context, ignoring forged fields", async () => {
  mocks.rpc.mockResolvedValue({ data: "receipt", error: null });
  const document = consentDocument("terms");
  const response = await POST(request({ type: "terms", version: document.version, action: "accept", user_id: "attacker", accepted_at: "2000-01-01", hash: "forged", context: "forged" }));
  expect(response.status).toBe(201);
  const args = mocks.rpc.mock.calls[0][1];
  expect(args.p_user_id).toBe("verified-member");
  expect(args.p_hash).toBe(document.hash);
  expect(args).not.toHaveProperty("accepted_at");
  expect(args.p_context).toMatchObject({ source: "account", action: "consent.accept", request_id: expect.any(String) });
});
test("stale documents and cross-origin writes are rejected", async () => {
  expect((await POST(request({ type: "terms", version: "old", action: "accept" }))).status).toBe(409);
  expect((await POST(request({}, "https://attacker.example"))).status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
