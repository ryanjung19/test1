import { afterEach, expect, test, vi } from "vitest";
import { createHmac, randomBytes } from "node:crypto";
import * as PortOne from "@portone/server-sdk";
import { MockBillingAdapter } from "@/lib/billing/adapter";
import { POST } from "@/app/api/billing/webhook/route";

afterEach(() => vi.unstubAllEnvs());
test("mock recurring charge is idempotent and requires the correct customer", async () => {
  const provider = new MockBillingAdapter();
  const { billingKey } = await provider.issueBillingKey({ authKey: "test-authorization", customerKey: "customer" });
  const charge = { billingKey, customerKey: "customer", orderId: "order-1", amount: 1000, idempotencyKey: "charge-1" };
  const first = await provider.charge(charge);
  expect(await provider.charge(charge)).toEqual(first);
  expect(await provider.getPayment("order-1")).toEqual(first);
  await expect(provider.charge({ ...charge, amount: 2000 })).rejects.toThrow("Idempotency conflict");
  await expect(provider.charge({ ...charge, customerKey: "another" })).rejects.toThrow("Invalid charge");
  await provider.cancelBillingKey(billingKey);
  await expect(provider.charge({ ...charge, orderId: "order-2" })).rejects.toThrow();
});
test("official verifier accepts signed raw data and rejects tampered data", async () => {
  const secret = randomBytes(32);
  const raw = JSON.stringify({ type: "Transaction.Paid", timestamp: new Date().toISOString(), data: { storeId: "store", paymentId: "payment", transactionId: "transaction" } });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", secret).update(`event-1.${timestamp}.${raw}`).digest("base64");
  const headers = { "webhook-id": "event-1", "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` };
  expect((await PortOne.Webhook.verify(secret, raw, headers)).type).toBe("Transaction.Paid");
  await expect(PortOne.Webhook.verify(secret, `${raw} `, headers)).rejects.toThrow();
});
test("webhook route rejects unsigned requests and unavailable configuration", async () => {
  vi.stubEnv("PORTONE_WEBHOOK_SECRET", "");
  expect((await POST(new Request("http://localhost/api/billing/webhook", { method: "POST", body: "{}" }))).status).toBe(503);
  vi.stubEnv("PORTONE_WEBHOOK_SECRET", randomBytes(32).toString("base64"));
  expect((await POST(new Request("http://localhost/api/billing/webhook", { method: "POST", body: "{}" }))).status).toBe(401);
});
