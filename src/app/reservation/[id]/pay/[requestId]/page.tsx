import { and, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, paymentRequests, paymentTransactions } from "@/db/schema";
import { verifyCustomerPortalToken } from "@/lib/auth/customer-portal";
import { tossPaymentsConfigured } from "@/lib/payments/toss-flow";

import { TossCheckout } from "./toss-checkout";
import styles from "./payment.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string; requestId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function CustomerPaymentPage({ params, searchParams }: PageProps) {
  const { id, requestId } = await params;
  const { token } = await searchParams;

  if (!token || !verifyCustomerPortalToken(id, token) || !isDatabaseConfigured()) {
    return <main className={styles.screen}><section className={styles.card}><h1>결제 링크를 확인할 수 없습니다.</h1></section></main>;
  }

  const [request] = await db
    .select()
    .from(paymentRequests)
    .where(and(eq(paymentRequests.id, requestId), eq(paymentRequests.bookingId, id)))
    .limit(1);
  const [booking] = await db
    .select({ id: bookings.id, bookingNumber: bookings.bookingNumber, title: bookings.title, customerName: bookings.customerName })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);

  if (!request || !booking || request.status === "cancelled") {
    return <main className={styles.screen}><section className={styles.card}><h1>결제 요청을 찾을 수 없습니다.</h1></section></main>;
  }

  const transactions = await db
    .select({ type: paymentTransactions.type, amount: paymentTransactions.amount, status: paymentTransactions.status })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.paymentRequestId, request.id));
  const netPaid = transactions
    .filter((row) => row.status === "succeeded")
    .reduce((sum, row) => sum + (row.type === "charge" ? row.amount : -row.amount), 0);
  const outstandingAmount = Math.max(request.amount - netPaid, 0);

  return (
    <main className={styles.screen}>
      <div className={styles.frame}>
        <header className={styles.brandRow}>
          <div className={styles.mark}>V1</div>
          <div><strong>VASSMENT ONE</strong><span>Secure Payment</span></div>
        </header>

        <section className={styles.card}>
          <p className={styles.eyebrow}>ONLINE CARD PAYMENT</p>
          <h1>{booking.customerName ?? booking.title}</h1>
          <dl className={styles.details}>
            <div><dt>예약번호</dt><dd>{booking.bookingNumber}</dd></div>
            <div><dt>청구 구분</dt><dd>{request.kind}</dd></div>
            <div><dt>청구 금액</dt><dd>{request.amount.toLocaleString("ko-KR")}원</dd></div>
            <div><dt>결제 완료</dt><dd>{Math.max(netPaid, 0).toLocaleString("ko-KR")}원</dd></div>
          </dl>

          {outstandingAmount <= 0 ? (
            <div className={styles.done}>이미 전액 결제된 청구입니다.</div>
          ) : tossPaymentsConfigured() ? (
            <TossCheckout
              bookingId={booking.id}
              paymentRequestId={request.id}
              token={token}
              outstandingAmount={outstandingAmount}
            />
          ) : (
            <div className={styles.warning}>온라인 카드결제 설정이 아직 활성화되지 않았습니다.</div>
          )}

          <a className={styles.backLink} href={`/reservation/${booking.id}?token=${encodeURIComponent(token)}`}>예약 상세로 돌아가기</a>
        </section>
      </div>
    </main>
  );
}
