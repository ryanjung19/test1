import { eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, bookingSpaces, paymentRequests, paymentTransactions, spaces } from "@/db/schema";
import { verifyCustomerPortalToken } from "@/lib/auth/customer-portal";
import { getCurrentContract } from "@/lib/contracts/service";
import { tossPaymentsConfigured } from "@/lib/payments/toss-flow";
import { getLatestCustomerQuote } from "@/lib/quotes/service";

import { acceptQuoteAction } from "./actions";
import styles from "./portal.module.css";

export const dynamic = "force-dynamic";

function dateTime(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

function customerStatus(status: string) {
  switch (status) {
    case "inquiry": return "문의 접수";
    case "hold":
    case "tentative": return "일정 임시 확보";
    case "confirmed": return "예약 확정";
    case "completed": return "행사 완료";
    case "cancelled": return "예약 종료";
    default: return "진행 중";
  }
}

function progressIndex(status: string) {
  if (status === "completed") return 4;
  if (status === "confirmed") return 3;
  if (status === "hold" || status === "tentative") return 2;
  return 1;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    token?: string;
    accepted?: string;
    error?: string;
    payment?: string;
    code?: string;
  }>;
};

export default async function ReservationPortalPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const token = query.token;

  if (!verifyCustomerPortalToken(id, token) || !isDatabaseConfigured()) {
    return (
      <main className={styles.screen}>
        <section className={styles.invalid}>
          <div><h1>예약 링크를 확인할 수 없습니다.</h1><p>링크가 만료되었거나 올바르지 않습니다. Vassment One 담당자에게 새 예약 확인 링크를 요청해 주세요.</p></div>
        </section>
      </main>
    );
  }

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking) return <main className={styles.screen}><section className={styles.invalid}><div><h1>예약 정보를 찾을 수 없습니다.</h1></div></section></main>;

  const [spaceRows, quoteData, contract, requestRows, transactionRows] = await Promise.all([
    db.select({ code: spaces.code }).from(bookingSpaces).innerJoin(spaces, eq(bookingSpaces.spaceId, spaces.id)).where(eq(bookingSpaces.bookingId, booking.id)),
    getLatestCustomerQuote(booking.id),
    getCurrentContract(booking.id),
    db.select().from(paymentRequests).where(eq(paymentRequests.bookingId, booking.id)),
    db.select().from(paymentTransactions).where(eq(paymentTransactions.bookingId, booking.id)),
  ]);

  const paidByRequest = new Map<string, number>();
  for (const transaction of transactionRows) {
    if (!transaction.paymentRequestId || transaction.status !== "succeeded") continue;
    const current = paidByRequest.get(transaction.paymentRequestId) ?? 0;
    paidByRequest.set(transaction.paymentRequestId, current + (transaction.type === "charge" ? transaction.amount : -transaction.amount));
  }

  const spacesText = spaceRows.map((row) => row.code).sort().join(" + ") || "-";
  const stage = progressIndex(booking.status);
  const progress = [
    [1, "문의", "접수 완료"],
    [2, "일정", stage >= 2 ? "확보" : "검토 중"],
    [3, "예약", stage >= 3 ? "확정" : "대기"],
    [4, "행사", stage >= 4 ? "완료" : "예정"],
  ] as const;
  const customerContractVisible = contract && (contract.status === "sent" || contract.status === "signed");
  const onlinePaymentEnabled = tossPaymentsConfigured();

  return (
    <main className={styles.screen}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <div className={styles.brand}><div className={styles.mark}>V1</div><div><strong>VASSMENT ONE</strong><span>Reservation Detail</span></div></div>
          <span className={styles.reference}>{booking.bookingNumber}</span>
        </header>

        <section className={styles.hero}>
          <div><p className={styles.eyebrow}>YOUR RESERVATION</p><h1>{booking.customerName ?? booking.title}</h1></div>
          <span className={styles.statusBadge}>{customerStatus(booking.status)}</span>
        </section>

        {query.accepted ? <div className="admin-alert admin-alert-success">견적을 승인했습니다. 담당자가 이후 계약/예약 확정 절차를 안내합니다.</div> : null}
        {query.error ? <div className="admin-alert admin-alert-error">견적 승인 요청을 처리하지 못했습니다. 견적 유효기간 또는 링크 상태를 확인해 주세요.</div> : null}
        {query.payment === "success" ? <div className="admin-alert admin-alert-success">온라인 카드결제가 정상 반영되었습니다.</div> : null}
        {query.payment === "failed" ? <div className="admin-alert admin-alert-error">결제가 완료되지 않았습니다. 다시 시도하거나 다른 결제수단을 이용해 주세요. {query.code ?? ""}</div> : null}
        {query.payment === "confirm_failed" ? <div className="admin-alert admin-alert-error">결제 승인 상태를 확인하는 중 문제가 발생했습니다. 중복 결제를 시도하지 말고 담당자에게 문의해 주세요.</div> : null}

        <section className={styles.progress} aria-label="예약 진행상태">
          {progress.map(([number, label, detail]) => (
            <div key={number} className={number < stage ? styles.progressDone : number === stage ? styles.progressActive : ""}>
              <span>0{number}</span><strong>{label}</strong><small>{detail}</small>
            </div>
          ))}
        </section>

        <div className={styles.grid}>
          <div className={styles.stack}>
            <section className={styles.panel}>
              <h2>예약 정보</h2>
              <dl className={styles.infoRows}>
                <div className={styles.infoRow}><dt>공간</dt><dd>{spacesText}</dd></div>
                <div className={styles.infoRow}><dt>행사 일정</dt><dd>{dateTime(booking.eventStartsAt)} → {dateTime(booking.eventEndsAt)}</dd></div>
                <div className={styles.infoRow}><dt>행사 유형</dt><dd>{booking.eventType ?? "-"}</dd></div>
                <div className={styles.infoRow}><dt>예상 인원</dt><dd>{booking.attendeeCount ? `${booking.attendeeCount.toLocaleString("ko-KR")}명` : "-"}</dd></div>
              </dl>
            </section>

            {quoteData ? (
              <section className={styles.panel}>
                <h2>견적 · Version {quoteData.quote.version}</h2>
                <div className={styles.quoteLines}>
                  {quoteData.items.map((item) => (
                    <div className={styles.quoteLine} key={item.id}>
                      <span>{item.category}</span>
                      <strong>{item.description}<br /><em>{item.quantity} × {krw(item.unitPrice)}</em></strong>
                      <b>{krw(item.amount)}</b>
                    </div>
                  ))}
                </div>
                <div className={styles.quoteTotals}>
                  <div><span>소계</span><strong>{krw(quoteData.quote.subtotal)}</strong></div>
                  {quoteData.quote.discountAmount > 0 ? <div><span>할인</span><strong>-{krw(quoteData.quote.discountAmount)}</strong></div> : null}
                  <div><span>VAT</span><strong>{krw(quoteData.quote.vatAmount)}</strong></div>
                  <div className={styles.quoteTotal}><span>총 견적</span><strong>{krw(quoteData.quote.totalAmount)}</strong></div>
                </div>
                <p className={styles.note}>견적 상태: {quoteData.quote.status} · 유효기간 {dateTime(quoteData.quote.validUntil)}</p>
                {quoteData.quote.status === "sent" ? (
                  <form className={styles.quoteAccept} action={acceptQuoteAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="quoteId" value={quoteData.quote.id} />
                    <input type="hidden" name="token" value={token ?? ""} />
                    <button className="button primary" type="submit">이 견적 승인</button>
                    <small>승인하면 견적 내용에 동의한 기록이 Booking OS에 남습니다.</small>
                  </form>
                ) : null}
                {quoteData.quote.status === "accepted" ? <div className={styles.acceptedBox}>✓ 견적 승인 완료</div> : null}
              </section>
            ) : <section className={styles.panel}><h2>견적</h2><p className={styles.note}>담당자가 견적을 준비 중입니다. 고객에게 발송된 견적이 생기면 이 화면에 표시됩니다.</p></section>}

            {customerContractVisible ? (
              <section className={styles.panel}>
                <h2>계약</h2>
                <dl className={styles.infoRows}>
                  <div className={styles.infoRow}><dt>상태</dt><dd>{contract.status}</dd></div>
                  <div className={styles.infoRow}><dt>전송</dt><dd>{dateTime(contract.sentAt)}</dd></div>
                  <div className={styles.infoRow}><dt>서명</dt><dd>{dateTime(contract.signedAt)}</dd></div>
                </dl>
                {contract.documentUrl ? <a className="button secondary button-link" href={contract.documentUrl} target="_blank" rel="noreferrer">계약서 확인</a> : null}
              </section>
            ) : null}
          </div>

          <aside className={styles.stack}>
            {booking.holdExpiresAt && (booking.status === "hold" || booking.status === "tentative") ? (
              <div className={styles.holdBox}><span>HOLD VALID UNTIL</span><strong>{dateTime(booking.holdExpiresAt)}</strong><p className={styles.note}>해당 시각까지 임시로 일정을 확보한 상태입니다. 연장 또는 최종 확정은 담당자와 협의해 주세요.</p></div>
            ) : null}

            <section className={styles.panel}>
              <h2>결제 현황</h2>
              {requestRows.length === 0 ? <p className={styles.note}>등록된 결제 요청이 없습니다.</p> : null}
              {requestRows.map((request) => {
                const paid = Math.max(paidByRequest.get(request.id) ?? 0, 0);
                const outstanding = Math.max(request.amount - paid, 0);
                const percent = request.amount > 0 ? Math.min((paid / request.amount) * 100, 100) : 0;
                const canPayOnline = onlinePaymentEnabled && outstanding > 0 && request.status !== "cancelled";
                return (
                  <div className={styles.paymentItem} key={request.id}>
                    <div className={styles.paymentItemTop}><div><span>{request.kind}</span><strong>{request.status} · {dateTime(request.dueAt)}</strong></div><b>{krw(paid)} / {krw(request.amount)}</b></div>
                    <div className={styles.paymentBar}><span style={{ width: `${percent}%` }} /></div>
                    {canPayOnline ? (
                      <a className="button primary button-link" href={`/reservation/${booking.id}/pay/${request.id}?token=${encodeURIComponent(token ?? "")}`}>카드로 {krw(outstanding)} 결제</a>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <section className={styles.panel}><h2>문의</h2><p className={styles.note}>일정 변경, 견적, 계약, 결제 관련 문의는 기존 Vassment One 담당 채널을 이용해 주세요.</p></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
