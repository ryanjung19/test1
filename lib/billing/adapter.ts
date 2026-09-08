export type BillingProvider = "portone" | "toss" | "mock";
export type VerifiedPayment = {
  paymentId: string;
  orderId: string;
  storeId: string;
  amount: number;
  currency: "KRW";
  status: "paid" | "failed" | "refunded";
  updatedAt: string;
};
export type ChargeRequest = { billingKey: string; customerKey: string; orderId: string; amount: number; idempotencyKey: string };

export interface RecurringBillingAdapter {
  readonly provider: BillingProvider;
  readonly mode: "mock" | "sandbox";
  issueBillingKey(input: { authKey: string; customerKey: string }): Promise<{ billingKey: string }>;
  charge(input: ChargeRequest): Promise<VerifiedPayment>;
  cancelBillingKey(billingKey: string): Promise<void>;
  getPayment(paymentId: string): Promise<VerifiedPayment>;
}

export type SandboxTransport = Omit<RecurringBillingAdapter, "provider" | "mode">;

export class PortOneSandboxAdapter implements RecurringBillingAdapter {
  readonly provider = "portone";
  readonly mode = "sandbox";
  constructor(private readonly transport: SandboxTransport) {}
  issueBillingKey(input: { authKey: string; customerKey: string }) { return this.transport.issueBillingKey(input); }
  charge(input: ChargeRequest) { return this.transport.charge(input); }
  cancelBillingKey(key: string) { return this.transport.cancelBillingKey(key); }
  getPayment(id: string) { return this.transport.getPayment(id); }
}

export class TossSandboxAdapter implements RecurringBillingAdapter {
  readonly provider = "toss";
  readonly mode = "sandbox";
  constructor(private readonly transport: SandboxTransport) {}
  issueBillingKey(input: { authKey: string; customerKey: string }) { return this.transport.issueBillingKey(input); }
  charge(input: ChargeRequest) { return this.transport.charge(input); }
  cancelBillingKey(key: string) { return this.transport.cancelBillingKey(key); }
  getPayment(id: string) { return this.transport.getPayment(id); }
}

export class MockBillingAdapter implements RecurringBillingAdapter {
  readonly provider = "mock";
  readonly mode = "mock";
  private keys = new Map<string, string>();
  private payments = new Map<string, VerifiedPayment>();
  private charges = new Map<string, { input: string; result: VerifiedPayment }>();
  async issueBillingKey({ authKey, customerKey }: { authKey: string; customerKey: string }) {
    if (!authKey || !customerKey) throw new Error("Authorization required");
    const billingKey = `mock-${crypto.randomUUID()}`;
    this.keys.set(billingKey, customerKey);
    return { billingKey };
  }
  async charge(input: ChargeRequest) {
    if (this.keys.get(input.billingKey) !== input.customerKey || !Number.isSafeInteger(input.amount) || input.amount <= 0 || !input.idempotencyKey || !input.orderId) throw new Error("Invalid charge");
    const fingerprint = JSON.stringify(input);
    const previous = this.charges.get(input.idempotencyKey);
    if (previous) {
      if (previous.input !== fingerprint) throw new Error("Idempotency conflict");
      return previous.result;
    }
    if (this.payments.has(input.orderId)) throw new Error("Order already charged");
    const result: VerifiedPayment = { paymentId: input.orderId, orderId: input.orderId, storeId: "mock-store", amount: input.amount, currency: "KRW", status: "paid", updatedAt: new Date().toISOString() };
    this.charges.set(input.idempotencyKey, { input: fingerprint, result });
    this.payments.set(result.paymentId, result);
    return result;
  }
  async cancelBillingKey(key: string) { this.keys.delete(key); }
  async getPayment(id: string) {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Payment not found");
    return payment;
  }
}
