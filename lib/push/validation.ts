export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };
const hosts = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);

export function parseSubscription(value: unknown): BrowserSubscription {
  if (!value || typeof value !== "object" || !("endpoint" in value) || typeof value.endpoint !== "string" || value.endpoint.length > 2048 || !("keys" in value) || !value.keys || typeof value.keys !== "object") throw new TypeError("Invalid subscription");
  const url = new URL(value.endpoint);
  if (url.protocol !== "https:" || !hosts.has(url.hostname) || url.port || url.username || url.password || url.hash || url.pathname === "/") throw new TypeError("Unsupported push endpoint");
  const keys = value.keys;
  if (!("p256dh" in keys) || !("auth" in keys) || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") throw new TypeError("Invalid keys");
  for (const [key, length] of [[keys.p256dh, 65], [keys.auth, 16]] as const) {
    if (!/^[A-Za-z0-9_-]+$/.test(key) || Buffer.from(key, "base64url").length !== length || Buffer.from(key, "base64url").toString("base64url") !== key) throw new TypeError("Invalid key encoding");
  }
  if (Buffer.from(keys.p256dh, "base64url")[0] !== 4) throw new TypeError("Invalid public key");
  return { endpoint: url.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}
