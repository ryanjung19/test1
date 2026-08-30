import { desc, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, contracts } from "@/db/schema";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import { saveContractAction, updateContractStatusAction } from "./actions";

export const dynamic = "force-dynamic";

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
  searchParams: Promise<{ error?: string; updated?: string }>;
};

export default async function ContractsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const configured = isDatabaseConfigured();
  const rows = configured
    ? await db
        .select({
          bookingId: bookings.id,
          bookingNumber: bookings.bookingNumber,
          bookingTitle: bookings.title,
          customerName: bookings.customerName,
          bookingStatus: bookings.status,
          contractId: contracts.id,
          contractStatus: contracts.status,
          documentUrl: contracts.documentUrl,
          sentAt: contracts.sentAt,
          signedAt: contracts.signedAt,
          metadata: contracts.metadata,
        })
        .from(bookings)
        .leftJoin(contracts, eq(bookings.id, contracts.bookingId))
        .where(eq(bookings.venueId, VASSMENT_ONE.venueId))
        .orderBy(desc(bookings.createdAt), desc(contracts.createdAt))
        .limit(300)
    : [];

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.bookingId)) latest.set(row.bookingId, row);
  }

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">CONTRACTS</p>
          <h1>예약별 계약문서와 전송·서명 상태를 관리합니다.</h1>
          <p className="subcopy">
            전자서명 공급자는 외부 adapter로 두고 Booking OS에는 문서 링크·외부 ID·상태만 저장합니다.
          </p>
        </div>
      </header>

      {!configured ? <div className="admin-alert admin-alert-warning">DATABASE_URL 설정 후 계약 관리를 사용할 수 있습니다.</div> : null}
      {query.error ? <div className="admin-alert admin-alert-error">계약 처리 실패: {query.error}</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">계약 정보를 반영했습니다.</div> : null}

      <section className="contract-list">
        {[...latest.values()].map((row) => {
          const metadata = row.metadata as { provider?: string; externalId?: string } | null;
          return (
            <article className="contract-card" key={row.bookingId}>
              <div className="contract-card-header">
                <div>
                  <span className={`booking-status contract-status-${row.contractStatus ?? "none"}`}>
                    {row.contractStatus ?? "not created"}
                  </span>
                  <span className="booking-number">{row.bookingNumber}</span>
                  <h2>{row.customerName ?? row.bookingTitle}</h2>
                  <p>예약 상태 · {row.bookingStatus}</p>
                </div>
                {row.documentUrl ? (
                  <a className="button secondary button-link" href={row.documentUrl} target="_blank" rel="noreferrer">계약문서 열기</a>
                ) : null}
              </div>

              <form className="contract-form" action={saveContractAction}>
                <input type="hidden" name="bookingId" value={row.bookingId} />
                <label>
                  <span>전자계약/문서 URL</span>
                  <input name="documentUrl" type="url" defaultValue={row.documentUrl ?? ""} placeholder="https://..." />
                </label>
                <label>
                  <span>공급자</span>
                  <input name="provider" defaultValue={metadata?.provider ?? ""} placeholder="예: external-esign" />
                </label>
                <label>
                  <span>외부 문서 ID</span>
                  <input name="externalId" defaultValue={metadata?.externalId ?? ""} />
                </label>
                <button className="button secondary" type="submit" disabled={row.contractStatus === "signed"}>문서 정보 저장</button>
              </form>

              {row.contractId ? (
                <div className="contract-status-actions">
                  <div className="contract-dates">
                    <span>전송 {dateTime(row.sentAt)}</span>
                    <span>서명 {dateTime(row.signedAt)}</span>
                  </div>
                  {row.contractStatus !== "signed" ? (
                    <>
                      {row.contractStatus !== "sent" ? (
                        <form action={updateContractStatusAction}>
                          <input type="hidden" name="contractId" value={row.contractId} />
                          <input type="hidden" name="status" value="sent" />
                          <button className="button primary" type="submit">고객 전송 상태</button>
                        </form>
                      ) : null}
                      <form action={updateContractStatusAction}>
                        <input type="hidden" name="contractId" value={row.contractId} />
                        <input type="hidden" name="status" value="signed" />
                        <button className="button primary" type="submit">서명 완료</button>
                      </form>
                      <form action={updateContractStatusAction}>
                        <input type="hidden" name="contractId" value={row.contractId} />
                        <input type="hidden" name="status" value="not_required" />
                        <button className="button secondary" type="submit">계약 불필요</button>
                      </form>
                      <form action={updateContractStatusAction}>
                        <input type="hidden" name="contractId" value={row.contractId} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="button secondary danger-button" type="submit">계약 취소</button>
                      </form>
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
