import { desc, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, quotes } from "@/db/schema";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

export const dynamic = "force-dynamic";

function krw(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function QuotesPage() {
  const configured = isDatabaseConfigured();
  const rows = configured
    ? await db
        .select({
          bookingId: bookings.id,
          bookingNumber: bookings.bookingNumber,
          title: bookings.title,
          customerName: bookings.customerName,
          bookingStatus: bookings.status,
          quoteId: quotes.id,
          quoteVersion: quotes.version,
          quoteStatus: quotes.status,
          totalAmount: quotes.totalAmount,
          quoteCreatedAt: quotes.createdAt,
        })
        .from(bookings)
        .leftJoin(quotes, eq(bookings.id, quotes.bookingId))
        .where(eq(bookings.venueId, VASSMENT_ONE.venueId))
        .orderBy(desc(bookings.createdAt), desc(quotes.version))
        .limit(300)
    : [];

  const latestByBooking = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByBooking.has(row.bookingId)) latestByBooking.set(row.bookingId, row);
  }

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">QUOTES</p>
          <h1>예약별 견적을 작성하고 고객에게 보낼 버전을 관리합니다.</h1>
          <p className="subcopy">기존 견적은 보존하며 새 수정안은 다음 버전으로 생성합니다.</p>
        </div>
      </header>

      {!configured ? <div className="admin-alert admin-alert-warning">DATABASE_URL 설정 후 견적을 사용할 수 있습니다.</div> : null}

      <section className="quote-index-grid">
        {[...latestByBooking.values()].map((row) => (
          <article className="quote-index-card" key={row.bookingId}>
            <div>
              <span className={`booking-status booking-status-${row.bookingStatus}`}>{row.bookingStatus}</span>
              <span className="booking-number">{row.bookingNumber}</span>
              <h2>{row.customerName ?? row.title}</h2>
            </div>
            <div className="quote-index-value">
              <span>{row.quoteId ? `v${row.quoteVersion} · ${row.quoteStatus}` : "견적 없음"}</span>
              <strong>{krw(row.quoteId ? row.totalAmount : null)}</strong>
            </div>
            <a className="button primary button-link" href={`/bookings/${row.bookingId}/quote`}>
              {row.quoteId ? "견적 관리" : "견적 작성"}
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
