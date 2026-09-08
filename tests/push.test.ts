import { expect, test } from "vitest";
import { createECDH, randomBytes } from "node:crypto";
import { parseSubscription } from "@/lib/push/validation";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const keys = { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") };
test("browser PushSubscription round trips with supported HTTPS push service", () => {
  const value = { endpoint: "https://fcm.googleapis.com/fcm/send/sample", keys };
  expect(parseSubscription(value)).toEqual(value);
});
test.each(["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.attacker.example/x", "https://user:pass@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x"])("rejects SSRF endpoint %s", (endpoint) => {
  expect(() => parseSubscription({ endpoint, keys })).toThrow();
});
test("rejects malformed or missing encryption keys", () => {
  expect(() => parseSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "x", auth: "x" } })).toThrow();
  expect(() => parseSubscription({ endpoint: "https://fcm.googleapis.com/x" })).toThrow();
});
