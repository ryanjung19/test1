import { desc, eq, inArray } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookings, interactions, leads } from "@/db/schema";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import { addInteractionAction, updateLeadStatusAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null) {
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
  searchParams: Promise<{ error?: string; updated?: string }>;
};

export default async function CrmPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const configured = isDatabaseConfigured();

  const leadRows = configured
    ? await db
        .select()
        .from(leads)
        .where(eq(leads.organizationId, VASSMENT_ONE.organizationId))
        .orderBy(desc(leads.createdAt))
        .limit(200)
    : [];

  const leadIds = leadRows.map((lead) => lead.id);
  const bookingRows =
    configured && leadIds.length
      ? await db
          .select({
            id: bookings.id,
            leadId: bookings.leadId,
            bookingNumber: bookings.bookingNumber,
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
            customerPhone: bookings.customerPhone,
            eventStartsAt: bookings.eventStartsAt,
            eventEndsAt: bookings.eventEndsAt,
            status: bookings.status,
          })
          .from(bookings)
          .where(inArray(bookings.leadId, leadIds))
      : [];

  const interactionRows =
    configured && leadIds.length
      ? await db
          .select()
          .from(interactions)
          .where(inArray(interactions.leadId, leadIds))
          .orderBy(desc(interactions.occurredAt))
      : [];

  const bookingByLead = new Map<string, (typeof bookingRows)[number]>();
  for (const booking of bookingRows) {
    if (booking.leadId && !bookingByLead.has(booking.leadId)) {
      bookingByLead.set(booking.leadId, booking);
    }
  }

  const interactionsByLead = new Map<string, typeof interactionRows>();
  for (const interaction of interactionRows) {
    if (!interaction.leadId) continue;
    const current = interactionsByLead.get(interaction.leadId) ?? [];
    if (current.length < 5) current.push(interaction);
    interactionsByLead.set(interaction.leadId, current);
  }

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">SALES CRM · LIVE</p>
          <h1>인바운드·아웃바운드 리드와 모든 접촉을 한 타임라인으로 관리합니다.</h1>
          <p className="subcopy">
            홈페이지 문의는 자동으로 website 리드가 되며 전화·메일·카카오·SNS 접촉과 다음 영업 액션을 이어서 기록합니다.
          </p>
        </div>
      </header>

      {!configured ? <div className="admin-alert admin-alert-warning">DATABASE_URL이 설정되지 않아 CRM은 미리보기 상태입니다.</div> : null}
      {query.error ? <div className="admin-alert admin-alert-error">CRM 입력값을 확인해 주세요.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">CRM 활동을 저장했습니다.</div> : null}

      <section className="crm-list">
        {leadRows.length === 0 ? <div className="panel admin-empty">등록된 영업 리드가 없습니다.</div> : null}

        {leadRows.map((lead) => {
          const booking = bookingByLead.get(lead.id);
          const history = interactionsByLead.get(lead.id) ?? [];
          return (
            <article className="crm-card" key={lead.id}>
              <div className="crm-card-header">
                <div>
                  <span className={`booking-status crm-status-${lead.status}`}>{lead.status}</span>
                  <span className="booking-number">{lead.source}</span>
                  <h2>{booking?.customerName ?? lead.title}</h2>
                  <p>{lead.title}</p>
                </div>
                <div className="crm-contact">
                  <strong>{booking?.customerPhone ?? "-"}</strong>
                  <span>{booking?.customerEmail ?? "-"}</span>
                </div>
              </div>

              <dl className="booking-meta-grid">
                <div><dt>희망 일정</dt><dd>{formatDateTime(lead.eventDateFrom)} → {formatDateTime(lead.eventDateTo)}</dd></div>
                <div><dt>예약 상태</dt><dd>{booking?.status ?? "-"}</dd></div>
                <div><dt>예약번호</dt><dd>{booking?.bookingNumber ?? "-"}</dd></div>
                <div><dt>다음 액션</dt><dd>{formatDateTime(lead.nextActionAt)}</dd></div>
              </dl>

              <div className="crm-control-grid">
                <form className="crm-form" action={updateLeadStatusAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label>
                    <span>영업 상태</span>
                    <select name="status" defaultValue={lead.status}>
                      <option value="new">New</option>
                      <option value="qualified">Qualified</option>
                      <option value="contacted">Contacted</option>
                      <option value="responded">Responded</option>
                      <option value="opportunity">Opportunity</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </label>
                  <label>
                    <span>다음 액션</span>
                    <input name="nextActionAt" type="datetime-local" />
                  </label>
                  <button className="button secondary" type="submit">상태 저장</button>
                </form>

                <form className="crm-form crm-interaction-form" action={addInteractionAction}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="bookingId" value={booking?.id ?? ""} />
                  <label>
                    <span>채널</span>
                    <select name="channel" defaultValue="phone">
                      <option value="phone">전화</option>
                      <option value="email">이메일</option>
                      <option value="kakao">카카오</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="meeting">미팅</option>
                      <option value="sms">SMS</option>
                      <option value="note">내부 메모</option>
                      <option value="other">기타</option>
                    </select>
                  </label>
                  <label>
                    <span>방향</span>
                    <select name="direction" defaultValue="outbound">
                      <option value="outbound">Outbound</option>
                      <option value="inbound">Inbound</option>
                      <option value="internal">Internal</option>
                    </select>
                  </label>
                  <label className="crm-field-wide">
                    <span>제목</span>
                    <input name="subject" />
                  </label>
                  <label className="crm-field-wide">
                    <span>내용</span>
                    <input name="summary" required placeholder="통화/메일 핵심 내용" />
                  </label>
                  <label>
                    <span>다음 액션</span>
                    <input name="nextActionAt" type="datetime-local" />
                  </label>
                  <button className="button primary" type="submit">접촉 기록</button>
                </form>
              </div>

              {history.length > 0 ? (
                <div className="crm-history">
                  {history.map((item) => (
                    <div key={item.id}>
                      <span>{formatDateTime(item.occurredAt)}</span>
                      <strong>{item.channel} · {item.direction}</strong>
                      <p>{item.subject ? `${item.subject} — ` : ""}{item.summary}</p>
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
