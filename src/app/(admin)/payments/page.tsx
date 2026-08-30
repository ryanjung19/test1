import { desc, eq, inArray } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, paymentRequests, paymentTransactions } from "@/db/schema";
import { listBookings } from "@/lib/booking/service";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import {
  createPaymentRequestAction,
  recordPaymentTransactionAction,
} from "./actions";

export const dynamic = "force-dynamic";

const errorLabels: Record<string, string> = {
  booking_not_found: "예약을 찾을 수 없습니다.",
  payment_request_not_found: "결제 요청을 찾을 수 없습니다.",
  invalid_amount: "금액을 확인해 주세요.",
  overpayment: "청구금액을 초과해 수납할 수 없습니다. 추가금 청구를 별도로 생성해 주세요.",
  refund_exceeds_paid: "현재까지 실제 수납된 금액보다 많이 환불할 수 없습니다.",
  invalid_request: "입력값을 확인해 주세요.",
  internal_error: "결제 장부 처리 중 오류가 발생했습니다.",
};

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

type PageProps = {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
};

export default async function PaymentsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const configured = isDatabaseConfigured();
  const bookingRows = configured
    ? await listBookings({ venueId: VASSMENT_ONE.venueId, limit: 200 })
    : [];

  const requestRows = configured
    ? await db
        .select({
          id: paymentRequests.id,
          bookingId: paymentRequests.bookingId,
          bookingNumber: bookings.bookingNumber,
          bookingTitle: bookings.title,
          customerName: bookings.customerName,
          kind: paymentRequests.kind,
          status: paymentRequests.status,
          amount: paymentRequests.amount,
          dueAt: paymentRequests.dueAt,
          memo: paymentRequests.memo,
          createdAt: paymentRequests.createdAt,
        })
        .from(paymentRequests)
        .innerJoin(bookings, eq(paymentRequests.bookingId, bookings.id))
        .where(eq(bookings.venueId, VASSMENT_ONE.venueId))
        .orderBy(desc(paymentRequests.createdAt))
    : [];

  const requestIds = requestRows.map((item) => item.id);
  const transactions =
    configured && requestIds.length > 0
      ? await db
          .select()
          .from(paymentTransactions)
          .where(inArray(paymentTransactions.paymentRequestId, requestIds))
          .orderBy(desc(paymentTransactions.createdAt))
      : [];

  const transactionsByRequest = new Map<string, typeof transactions>();
  for (const transaction of transactions) {
    if (!transaction.paymentRequestId) continue;
    const current = transactionsByRequest.get(transaction.paymentRequestId) ?? [];
    current.push(transaction);
    transactionsByRequest.set(transaction.paymentRequestId, current);
  }

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">PAYMENTS · MANUAL LEDGER</p>
          <h1>계약금·잔금·추가금과 실제 수납·환불을 분리해 관리합니다.</h1>
          <p className="subcopy">
            현금·계좌이체·현장카드는 지금 바로 장부에 반영할 수 있습니다. 온라인 카드는 이후 Toss Payments webhook으로 같은 거래 테이블에 들어옵니다.
          </p>
        </div>
      </header>

      {!configured ? (
        <div className="admin-alert admin-alert-warning">DATABASE_URL이 설정되지 않아 결제 장부는 미리보기 상태입니다.</div>
      ) : null}
      {query.error ? <div className="admin-alert admin-alert-error">{errorLabels[query.error] ?? query.error}</div> : null}
      {query.created ? <div className="admin-alert admin-alert-success">결제 요청을 생성했습니다.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">수납/환불 거래를 반영했습니다.</div> : null}

      <div className="admin-alert admin-alert-warning">
        카드번호·CVC·유효기간은 절대 입력하지 않습니다. 현장카드는 승인번호 등 비민감 참조값만 기록합니다.
      </div>

      <details className="panel admin-create-panel">
        <summary>새 결제 요청 생성</summary>
        <form className="admin-form-grid" action={createPaymentRequestAction}>
          <label className="admin-field admin-field-wide">
            <span>예약</span>
            <select name="bookingId" required defaultValue="">
              <option value="" disabled>예약 선택</option>
              {bookingRows
                .filter((booking) => booking.status !== "cancelled")
                .map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.bookingNumber} · {booking.customerName ?? booking.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="admin-field">
            <span>청구 종류</span>
            <select name="kind" defaultValue="deposit">
              <option value="deposit">계약금</option>
              <option value="interim">중도금</option>
              <option value="balance">잔금</option>
              <option value="additional">추가금</option>
            </select>
          </label>
          <label className="admin-field">
            <span>금액(KRW)</span>
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <label className="admin-field">
            <span>결제 기한</span>
            <input name="dueAt" type="datetime-local" />
          </label>
          <label className="admin-field admin-field-wide">
            <span>메모</span>
            <input name="memo" placeholder="예: 총 계약금액의 계약금" />
          </label>
          <div className="admin-form-actions">
            <button className="button primary" type="submit" disabled={!configured}>청구 생성</button>
          </div>
        </form>
      </details>

      <section className="payment-list">
        {requestRows.length === 0 ? <div className="panel admin-empty">결제 요청이 없습니다.</div> : null}

        {requestRows.map((request) => {
          const requestTransactions = transactionsByRequest.get(request.id) ?? [];
          const paid = requestTransactions
            .filter((item) => item.status === "succeeded")
            .reduce((sum, item) => sum + (item.type === "charge" ? item.amount : -item.amount), 0);
          const remaining = Math.max(request.amount - paid, 0);

          return (
            <article className="payment-card" key={request.id}>
              <div className="payment-card-header">
                <div>
                  <span className={`booking-status payment-status-${request.status}`}>{request.status}</span>
                  <span className="booking-number">{request.bookingNumber}</span>
                  <h2>{request.customerName ?? request.bookingTitle}</h2>
                  <p>{request.kind} · 기한 {dateTime(request.dueAt)}</p>
                </div>
                <div className="payment-totals">
                  <div><span>청구</span><strong>{krw(request.amount)}</strong></div>
                  <div><span>수납</span><strong>{krw(paid)}</strong></div>
                  <div><span>미수</span><strong>{krw(remaining)}</strong></div>
                </div>
              </div>

              <form className="payment-transaction-form" action={recordPaymentTransactionAction}>
                <input type="hidden" name="bookingId" value={request.bookingId} />
                <input type="hidden" name="paymentRequestId" value={request.id} />
                <label>
                  <span>처리</span>
                  <select name="type" defaultValue="charge">
                    <option value="charge">수납</option>
                    <option value="refund">환불</option>
                  </select>
                </label>
                <label>
                  <span>수단</span>
                  <select name="method" defaultValue="bank_transfer">
                    <option value="bank_transfer">계좌이체</option>
                    <option value="cash">현금</option>
                    <option value="card_offline">현장 카드</option>
                    <option value="other">기타</option>
                  </select>
                </label>
                <label>
                  <span>금액</span>
                  <input name="amount" type="number" min="1" step="1" defaultValue={remaining || undefined} required />
                </label>
                <label>
                  <span>처리 일시</span>
                  <input name="approvedAt" type="datetime-local" />
                </label>
                <label>
                  <span>승인/참조번호</span>
                  <input name="reference" placeholder="선택" />
                </label>
                <label>
                  <span>메모</span>
                  <input name="memo" />
                </label>
                <button className="button primary" type="submit">거래 반영</button>
              </form>

              {requestTransactions.length > 0 ? (
                <div className="transaction-history">
                  {requestTransactions.map((transaction) => (
                    <div key={transaction.id}>
                      <span>{dateTime(transaction.approvedAt ?? transaction.createdAt)}</span>
                      <strong>{transaction.type === "charge" ? "+" : "-"}{krw(transaction.amount)}</strong>
                      <em>{transaction.method}{transaction.providerPaymentId ? ` · ${transaction.providerPaymentId}` : ""}</em>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
