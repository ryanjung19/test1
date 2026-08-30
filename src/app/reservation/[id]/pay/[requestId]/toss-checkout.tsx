"use client";

import { useState } from "react";

import styles from "./payment.module.css";

type TossWidgets = {
  setAmount: (amount: { value: number; currency: "KRW" }) => Promise<void>;
  renderPaymentMethods: (params: { selector: string; variantKey?: string }) => Promise<unknown>;
  renderAgreement: (params: { selector: string; variantKey?: string }) => Promise<unknown>;
  requestPayment: (params: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
};

type TossFactory = (clientKey: string) => {
  widgets: (params: { customerKey: string }) => TossWidgets;
};

declare global {
  interface Window {
    TossPayments?: TossFactory;
  }
}

type Intent = {
  intentId: string;
  clientKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  successUrl: string;
  failUrl: string;
};

function loadTossSdk() {
  if (window.TossPayments) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-toss-v2]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("sdk_load_failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.dataset.tossV2 = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("sdk_load_failed")), { once: true });
    document.head.appendChild(script);
  });
}

export function TossCheckout(props: {
  bookingId: string;
  paymentRequestId: string;
  token: string;
  outstandingAmount: number;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [widgets, setWidgets] = useState<TossWidgets | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/public/payments/toss/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: props.bookingId,
          paymentRequestId: props.paymentRequestId,
          token: props.token,
        }),
      });
      const data = (await response.json()) as Intent & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "intent_failed");
      }

      await loadTossSdk();
      if (!window.TossPayments) throw new Error("sdk_not_available");

      const tossPayments = window.TossPayments(data.clientKey);
      const nextWidgets = tossPayments.widgets({ customerKey: "ANONYMOUS" });
      await nextWidgets.setAmount({ value: data.amount, currency: "KRW" });
      await Promise.all([
        nextWidgets.renderPaymentMethods({ selector: "#toss-payment-method" }),
        nextWidgets.renderAgreement({ selector: "#toss-agreement" }),
      ]);

      setIntent(data);
      setWidgets(nextWidgets);
    } catch (cause) {
      console.error(cause);
      setError("온라인 결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!intent || !widgets) return;
    setBusy(true);
    setError(null);
    try {
      await widgets.requestPayment({
        orderId: intent.orderId,
        orderName: intent.orderName,
        successUrl: intent.successUrl,
        failUrl: intent.failUrl,
      });
    } catch (cause) {
      console.error(cause);
      setError("결제창을 열 수 없습니다. 결제수단을 확인하고 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <section className={styles.checkout}>
      <div className={styles.amountRow}>
        <span>온라인 결제 예정액</span>
        <strong>{props.outstandingAmount.toLocaleString("ko-KR")}원</strong>
      </div>

      {!intent ? (
        <button className={styles.primaryButton} type="button" onClick={prepare} disabled={busy}>
          {busy ? "결제 준비 중" : "카드 결제 준비"}
        </button>
      ) : null}

      <div id="toss-payment-method" className={styles.widgetArea} />
      <div id="toss-agreement" className={styles.widgetArea} />

      {intent ? (
        <button className={styles.primaryButton} type="button" onClick={pay} disabled={busy}>
          {busy ? "처리 중" : `${intent.amount.toLocaleString("ko-KR")}원 결제하기`}
        </button>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
      <p className={styles.note}>
        카드 정보는 Vassment One 서버에 저장되지 않으며 토스페이먼츠 결제 화면에서 처리됩니다.
      </p>
    </section>
  );
}
