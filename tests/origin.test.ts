import { expect, test } from "vitest";
import { requireSameOrigin } from "@/lib/http";

test("same-origin browser writes survive Next internal hostname normalization", () => {
  const request = new Request("http://localhost:3107/api/consents", { method: "POST", headers: { host: "127.0.0.1:3107", origin: "http://127.0.0.1:3107" } });
  expect(() => requireSameOrigin(request)).not.toThrow();
});
test("mismatched browser origin cannot borrow the internal host", () => {
  const request = new Request("http://localhost:3107/api/consents", { method: "POST", headers: { host: "127.0.0.1:3107", origin: "http://localhost:3107" } });
  expect(() => requireSameOrigin(request)).toThrow();
});
test("trusted TLS termination preserves HTTPS origin without trusting forwarded host", () => {
  const headers = { host: "preview.example.com", origin: "https://preview.example.com", "x-forwarded-proto": "https", "x-forwarded-host": "attacker.example.com" };
  expect(() => requireSameOrigin(new Request("http://localhost/api/consents", { headers }))).not.toThrow();
  expect(() => requireSameOrigin(new Request("http://localhost/api/consents", { headers: { ...headers, origin: "https://attacker.example.com" } }))).toThrow();
});
test("missing or null origins are denied", () => {
  for (const headers of [new Headers(), new Headers({ origin: "null" })]) expect(() => requireSameOrigin(new Request("https://preview.example.com/api/consents", { headers }))).toThrow();
});
