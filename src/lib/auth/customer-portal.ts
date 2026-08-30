import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;

type CustomerPortalPayload = {
  bookingId: string;
  exp: number;
};

function portalSecret() {
  return process.env.CUSTOMER_PORTAL_SECRET;
}

function sign(encoded: string) {
  const secret = portalSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function customerPortalConfigured() {
  return Boolean(portalSecret());
}

export function createCustomerPortalToken(
  bookingId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  if (!portalSecret()) return null;
  const payload: CustomerPortalPayload = {
    bookingId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return signature ? `${encoded}.${signature}` : null;
}

export function verifyCustomerPortalToken(bookingId: string, token: string | undefined) {
  if (!token) return false;
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature) return false;

  const expectedSignature = sign(encoded);
  if (!expectedSignature) return false;

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as CustomerPortalPayload;
    return (
      payload.bookingId === bookingId &&
      Number.isFinite(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function customerPortalUrl(bookingId: string) {
  const token = createCustomerPortalToken(bookingId);
  if (!token) return null;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${appUrl}/reservation/${bookingId}?token=${encodeURIComponent(token)}`;
}
