import { afterEach, expect, test, vi } from "vitest";
import { GET } from "@/app/api/market/hot/route";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
function configure() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-placeholder");
}
test("unconfigured service fails closed and never returns market items", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty("items");
});
test("anonymous request cannot access Premium data", async () => {
  configure(); mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await GET();
  expect(response.status).toBe(401);
  expect(await response.json()).not.toHaveProperty("items");
});
test("login alone does not grant Premium access", async () => {
  configure(); mocks.getUser.mockResolvedValue({ data: { user: { id: "member" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  const response = await GET();
  expect(response.status).toBe(403);
  expect(await response.json()).not.toHaveProperty("items");
});
test("entitlement query errors fail closed", async () => {
  configure(); mocks.getUser.mockResolvedValue({ data: { user: { id: "member" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: { message: "db failure" } });
  expect((await GET()).status).toBe(503);
});
test("entitled member receives explicitly marked demo data without shared caching", async () => {
  configure(); mocks.getUser.mockResolvedValue({ data: { user: { id: "member" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({ mode: "demo", source: "demo-fixture", items: expect.any(Array) });
});
