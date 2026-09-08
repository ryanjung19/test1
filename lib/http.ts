import "server-only";
import { AccessError } from "@/lib/auth/access";

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
export function failure(error: unknown) {
  if (error instanceof AccessError) return json({ error: error.code }, error.status);
  return json({ error: "service_unavailable" }, 503);
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new AccessError(403, "invalid_origin");
}
export async function readJson(request: Request, limit = 8192): Promise<unknown> {
  const raw = await readBody(request, limit);
  try { return JSON.parse(raw) as unknown; } catch { throw new TypeError("Invalid JSON"); }
}
export async function readBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new TypeError("Body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new TypeError("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
