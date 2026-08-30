import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "vassment_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  exp: number;
};

function secret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function sign(value: string) {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(value).digest("base64url");
}

export function adminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(provided: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function createAdminSessionToken() {
  if (!secret()) return null;

  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return signature ? `${encoded}.${signature}` : null;
}

export function verifyAdminSessionToken(token: string | undefined) {
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
    ) as SessionPayload;

    return Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  if (!adminAuthConfigured()) return false;
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
