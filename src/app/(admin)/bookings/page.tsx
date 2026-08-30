import { eq, inArray } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { bookingSpaces, spaces } from "@/db/schema";
import { listBookings } from "@/lib/booking/service";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import {
  activateInquiryHoldAction,
  bookingLifecycleAction,
  createAdminBookingAction,
} from "./actions";

export const dynamic = "force-dynamic";

const errorLabels: Record<string, string> = {
  schedule_conflict: "선택한 공간·시간에 기존 예약 또는 블록이 있습니다.",
  invalid_request: "입력값을 확인해 주세요.",
  invalid_transition: "현재 예약 상태에서는 해당 작업을 수행할 수 없습니다.",
  hold_expiration_required: "HOLD 만료시간이 필요합니다.",
  hold_expiration_must_be_future: "HOLD 만료시간은 현재보다 이후여야 합니다.",
  booking_not_found: "예약을 찾을 수 없습니다.",
  invalid_space: "예약 공간 정보가 올바르지 않습니다.",
  internal_error: "처리 중 오류가 발생했습니다.",
};

function formatDateTime(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatHold(value: Date | null) {
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
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
  }>;
};

export default async function BookingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const configured = isDatabaseConfigured();
  const rows = configured
    ? await listBookings({ venueId: VASSMENT_ONE.venueId, limit: 150 })
    : [];

  const ids = rows.map((booking) => booking.id);
  const mappings =
    configured && ids.length > 0
      ? await db
          .select({ bookingId: bookingSpaces.bookingId, code: spaces.code })
          .from(bookingSpaces)
          .innerJoin(spaces, eq(bookingSpaces.spaceId, spaces.id))
          .where(inArray(bookingSpaces.bookingId, ids))
      : [];

  const spaceMap = new Map<string, string[]>();
  for (const mapping of mappings) {
    const current = spaceMap.get(mapping.bookingId) ?? [];
    current.push(mapping.code);
    spaceMap.set(mapping.bookingId, current);
  }

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">BOOKINGS · LIVE OPERATIONS</p>
          <h1>문의부터 HOLD·확정·완료까지 예약을 운영합니다.</h1>
          <p className="subcopy">
            홈페이지 문의도 이 목록으로 들어오며, 문의를 HOLD로 승격하는 순간 실제 B1/1F 일정 블록이 생성됩니다.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary button-link" href="/reserve" target="_blank" rel="noreferrer">고객 화면</a>
          <a className="button secondary button-link" href="/calendar">캘린더</a>
        </div>
      </header>

      {!configured ? (
        <div className="admin-alert admin-alert-warning">
          DATABASE_URL이 설정되지 않아 UI 미리보기 상태입니다. DB 연결 후 실데이터가 표시됩니다.
        </div>
      ) : null}
      {query.error ? (
        <div className="admin-alert admin-alert-error">
          {errorLabels[query.error] ?? query.error}
        </div>
      ) : null}
      {query.created ? <div className="admin-alert admin-alert-success">예약을 생성했습니다.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">예약 상태를 반영했습니다.</div> : null}

      <details className="panel admin-create-panel">
        <summary>새 예약 직접 생성</summary>
        <form className="admin-form-grid" action={createAdminBookingAction}>
          <label className="admin-field admin-field-wide">
            <span>예약명</span>
            <input name="title" required placeholder="예: Brand A Launch Event" />
          </label>
          <label className="admin-field">
            <span>고객 / 회사</span>
            <input name="customerName" />
          </label>
          <label className="admin-field">
            <span>행사 유형</span>
            <input name="eventType" />
          </label>
          <label className="admin-field">
            <span>이메일</span>
            <input name="customerEmail" type="email" />
          </label>
          <label className="admin-field">
            <span>연락처</span>
            <input name="customerPhone" />
          </label>
          <label className="admin-field">
            <span>공간</span>
            <select name="space" defaultValue="ALL">
              <option value="1F">1F</option>
              <option value="B1">B1</option>
              <option value="ALL">1F + B1</option>
            </select>
          </label>
          <label className="admin-field">
            <span>날짜</span>
            <input name="date" type="date" required />
          </label>
          <label className="admin-field">
            <span>시작</span>
            <input name="startTime" type="time" defaultValue="14:00" required />
          </label>
          <label className="admin-field">
            <span>종료</span>
            <input name="endTime" type="time" defaultValue="22:00" required />
          </label>
          <label className="admin-field">
            <span>준비 시간(분)</span>
            <input name="setupMinutes" type="number" min="0" defaultValue="0" required />
          </label>
          <label className="admin-field">
            <span>철수 시간(분)</span>
            <input name="teardownMinutes" type="number" min="0" defaultValue="0" required />
          </label>
          <label className="admin-field">
            <span>예상 인원</span>
            <input name="attendeeCount" type="number" min="1" />
          </label>
          <label className="admin-field">
            <span>초기 상태</span>
            <select name="status" defaultValue="hold">
              <option value="hold">HOLD</option>
              <option value="tentative">Tentative</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
          <label className="admin-field admin-field-wide">
            <span>HOLD 만료 · HOLD/Tentative일 때 필수</span>
            <input name="holdExpiresAt" type="datetime-local" />
          </label>
          <label className="admin-field admin-field-wide">
            <span>메모</span>
            <textarea name="notes" rows={3} />
          </label>
          <div className="admin-form-actions admin-field-wide">
            <button className="button primary" type="submit" disabled={!configured}>예약 생성</button>
          </div>
        </form>
      </details>

      <section className="booking-list" aria-label="예약 목록">
        {rows.length === 0 ? (
          <div className="panel admin-empty">등록된 예약이 없습니다.</div>
        ) : null}

        {rows.map((booking) => {
          const codes = (spaceMap.get(booking.id) ?? []).sort();
          return (
            <article className="booking-card" key={booking.id}>
              <div className="booking-card-top">
                <div>
                  <span className={`booking-status booking-status-${booking.status}`}>{booking.status}</span>
                  <span className="booking-number">{booking.bookingNumber}</span>
                  <h2>{booking.title}</h2>
                </div>
                <div className="booking-spaces">{codes.length ? codes.join(" + ") : "공간 미지정"}</div>
              </div>

              <dl className="booking-meta-grid">
                <div><dt>고객</dt><dd>{booking.customerName ?? "-"}</dd></div>
                <div><dt>일정</dt><dd>{formatDateTime(booking.eventStartsAt)} → {formatDateTime(booking.eventEndsAt)}</dd></div>
                <div><dt>HOLD 만료</dt><dd>{formatHold(booking.holdExpiresAt)}</dd></div>
                <div><dt>연락</dt><dd>{booking.customerPhone ?? booking.customerEmail ?? "-"}</dd></div>
              </dl>

              <div className="booking-actions">
                {booking.status === "inquiry" ? (
                  <form className="inline-action-form" action={activateInquiryHoldAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <label>준비 <input name="setupMinutes" type="number" min="0" defaultValue="0" /></label>
                    <label>철수 <input name="teardownMinutes" type="number" min="0" defaultValue="0" /></label>
                    <label>HOLD 만료 <input name="holdExpiresAt" type="datetime-local" required /></label>
                    <button className="button primary" type="submit">HOLD 등록</button>
                  </form>
                ) : null}

                {booking.status === "hold" || booking.status === "tentative" ? (
                  <>
                    <form action={bookingLifecycleAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="action" value="confirm" />
                      <button className="button primary" type="submit">예약 확정</button>
                    </form>
                    <form className="inline-action-form" action={bookingLifecycleAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="action" value="extend_hold" />
                      <label>새 만료 <input name="holdExpiresAt" type="datetime-local" required /></label>
                      <button className="button secondary" type="submit">HOLD 연장</button>
                    </form>
                  </>
                ) : null}

                {booking.status === "confirmed" ? (
                  <form action={bookingLifecycleAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="action" value="complete" />
                    <button className="button secondary" type="submit">행사 완료</button>
                  </form>
                ) : null}

                {!(["cancelled", "completed"] as string[]).includes(booking.status) ? (
                  <form action={bookingLifecycleAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="action" value="cancel" />
                    <button className="button secondary danger-button" type="submit">취소</button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
