import { timingSafeEqual } from "node:crypto";

export function verifyIntegrationSecret(request: Request) {
  const expected = process.env.INTEGRATION_WEBHOOK_SECRET;

  if (!expected) {
    throw new Error("INTEGRATION_WEBHOOK_SECRET is not configured");
  }

  const provided = request.headers.get("x-integration-secret");
  if (!provided) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
