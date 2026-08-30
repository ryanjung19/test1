import { timingSafeEqual } from "node:crypto";

function safeEqual(provided: string | null, expected: string | undefined) {
  if (!expected) return null;
  if (!provided) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function verifyIntegrationSecret(request: Request) {
  const result = safeEqual(
    request.headers.get("x-integration-secret"),
    process.env.INTEGRATION_WEBHOOK_SECRET,
  );

  if (result === null) {
    throw new Error("INTEGRATION_WEBHOOK_SECRET is not configured");
  }

  return result;
}

export function verifyAutomationSecret(request: Request) {
  const result = safeEqual(
    request.headers.get("x-automation-secret"),
    process.env.AUTOMATION_SECRET,
  );

  if (result === null) {
    throw new Error("AUTOMATION_SECRET is not configured");
  }

  return result;
}
