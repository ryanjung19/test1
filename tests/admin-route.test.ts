import { afterEach, expect, test, vi } from "vitest";
import { GET } from "@/app/api/admin/route";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/auth/access", async (original) => ({ ...await original<typeof import("@/lib/auth/access")>(), requireMember: async () => ({ supabase: { rpc: mocks.rpc }, user: { id: "member", user_metadata: { role: "admin" } } }) }));
afterEach(() => vi.resetAllMocks());
test("self-asserted admin metadata never overrides server role denial", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect((await GET()).status).toBe(403);
});
test("admin overview is private and noncacheable", async () => {
  mocks.rpc.mockResolvedValue({ data: { members: 2 }, error: null });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ members: 2 });
});
