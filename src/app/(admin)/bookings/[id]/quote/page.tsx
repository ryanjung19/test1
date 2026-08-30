import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, quoteItems, quotes } from "@/db/schema";

import { updateQuoteStatusAction } from "./actions";
import { QuoteEditor } from "./quote-editor";

export const dynamic = "force-dynamic";

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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
};

export default async function QuotePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const configured = isDatabaseConfigured();

  if (!configured) {
    return (
      <div className="page-wrap">
        <div className="admin-alert admin-alert-warning">DATABASE_URL 설정 후 견적 편집을 사용할 수 있습니다.</div>
      </div>
    );
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!booking) notFound();

  const quoteRows = await db
    .select()
    .from(quotes)
    .where(eq(quotes.bookingId, booking.id))
    .orderBy(desc(quotes.version));

  const quoteIds = quoteRows.map((quote) => quote.id);
  const itemRows = quoteIds.length
    ? await db
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteIds[0]))
        .orderBy(asc(quoteItems.sortOrder))
    : [];

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">QUOTE · {booking.bookingNumber}</p>
          <h1>{booking.customerName ?? booking.title} 견적</h1>
          <p className="subcopy">
            새 버전을 저장하면 기존 견적은 삭제되지 않습니다. 고객 공개용 견적은 상태를 `sent`로 바꾼 버전만 사용합니다.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary button-link" href="/bookings">예약 목록</a>
        </div>
      </header>

      {query.error ? <div className="admin-alert admin-alert-error">견적 처리 실패: {query.error}</div> : null}
      {query.created ? <div className="admin-alert admin-alert-success">새 견적 버전을 저장했습니다.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">견적 상태를 변경했습니다.</div> : null}

      <section className="panel quote-create-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW VERSION</p>
            <h2>견적 작성</h2>
          </div>
        </div>
        <QuoteEditor bookingId={booking.id} />
      </section>

      <section className="quote-history">
        {quoteRows.length === 0 ? <div className="panel admin-empty">저장된 견적이 없습니다.</div> : null}

        {quoteRows.map((quote, index) => (
          <article className="quote-card" key={quote.id}>
            <div className="quote-card-header">
              <div>
                <span className={`booking-status quote-status-${quote.status}`}>{quote.status}</span>
                <span className="booking-number">VERSION {quote.version}</span>
                <h2>{krw(quote.totalAmount)}</h2>
                <p>유효기간 {dateTime(quote.validUntil)} · 생성 {dateTime(quote.createdAt)}</p>
              </div>
              <div className="quote-summary-mini">
                <div><span>소계</span><strong>{krw(quote.subtotal)}</strong></div>
                <div><span>할인</span><strong>{krw(quote.discountAmount)}</strong></div>
                <div><span>VAT</span><strong>{krw(quote.vatAmount)}</strong></div>
              </div>
            </div>

            {index === 0 && itemRows.length > 0 ? (
              <div className="quote-preview-lines">
                {itemRows.map((item) => (
                  <div key={item.id}>
                    <span>{item.category}</span>
                    <strong>{item.description}</strong>
                    <em>{item.quantity} × {krw(item.unitPrice)}</em>
                    <b>{krw(item.amount)}</b>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="prospect-actions">
              {quote.status === "draft" ? (
                <form action={updateQuoteStatusAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="status" value="sent" />
                  <button className="button primary" type="submit">고객에게 보낼 버전으로 지정</button>
                </form>
              ) : null}
              {quote.status !== "accepted" && quote.status !== "cancelled" ? (
                <form action={updateQuoteStatusAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button className="button secondary danger-button" type="submit">견적 취소</button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
