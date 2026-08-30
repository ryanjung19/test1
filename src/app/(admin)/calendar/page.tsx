import { isDatabaseConfigured } from "@/db";
import { listScheduleBlocks } from "@/lib/booking/service";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import { cancelManualBlockAction, createManualBlockAction } from "./actions";

export const dynamic = "force-dynamic";

function datePlusDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function localDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function time(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function dayLabel(date: string) {
  const value = new Date(`${date}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(value);
}

type PageProps = {
  searchParams: Promise<{
    date?: string;
    error?: string;
    created?: string;
    updated?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const validDate = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : todayInSeoul();
  const days = Array.from({ length: 7 }, (_, index) => datePlusDays(validDate, index));
  const from = new Date(`${validDate}T00:00:00+09:00`);
  const to = new Date(`${datePlusDays(validDate, 7)}T00:00:00+09:00`);
  const configured = isDatabaseConfigured();
  const blocks = configured
    ? await listScheduleBlocks({ venueId: VASSMENT_ONE.venueId, from, to })
    : [];

  const spaceCodeById = new Map<string, string>([
    [VASSMENT_ONE.spaces["1F"], "1F"],
    [VASSMENT_ONE.spaces.B1, "B1"],
  ]);

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">VENUE CALENDAR · ASIA/SEOUL</p>
          <h1>B1과 1F의 실제 점유시간을 주간 단위로 확인합니다.</h1>
          <p className="subcopy">
            HOLD·확정예약·준비·철수·내부행사·점검을 동일한 일정 블록으로 표시합니다.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary button-link" href={`/calendar?date=${datePlusDays(validDate, -7)}`}>이전 7일</a>
          <a className="button secondary button-link" href={`/calendar?date=${todayInSeoul()}`}>오늘</a>
          <a className="button secondary button-link" href={`/calendar?date=${datePlusDays(validDate, 7)}`}>다음 7일</a>
          <a className="button primary button-link" href="/bookings">예약 관리</a>
        </div>
      </header>

      {!configured ? (
        <div className="admin-alert admin-alert-warning">
          DATABASE_URL이 설정되지 않아 실시간 일정 대신 빈 캘린더를 표시합니다.
        </div>
      ) : null}
      {query.error ? (
        <div className="admin-alert admin-alert-error">
          {query.error === "schedule_conflict"
            ? "선택한 시간에 기존 예약 또는 블록이 있습니다."
            : "내부 일정 입력값을 확인해 주세요."}
        </div>
      ) : null}
      {query.created ? <div className="admin-alert admin-alert-success">내부 일정 블록을 생성했습니다.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">내부 일정 블록을 해제했습니다.</div> : null}

      <details className="panel admin-create-panel">
        <summary>내부행사 / 점검 블록 등록</summary>
        <form className="admin-form-grid" action={createManualBlockAction}>
          <label className="admin-field admin-field-wide">
            <span>일정명</span>
            <input name="title" required placeholder="예: 내부 촬영 / 시설 점검" />
          </label>
          <label className="admin-field">
            <span>종류</span>
            <select name="type" defaultValue="internal">
              <option value="internal">내부 행사</option>
              <option value="maintenance">점검 / 사용불가</option>
            </select>
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
            <input name="date" type="date" defaultValue={validDate} required />
          </label>
          <label className="admin-field">
            <span>시작</span>
            <input name="startTime" type="time" defaultValue="09:00" required />
          </label>
          <label className="admin-field">
            <span>종료</span>
            <input name="endTime" type="time" defaultValue="18:00" required />
          </label>
          <label className="admin-field admin-field-wide">
            <span>메모</span>
            <input name="note" />
          </label>
          <div className="admin-form-actions">
            <button className="button primary" type="submit" disabled={!configured}>블록 생성</button>
          </div>
        </form>
      </details>

      <section className="week-calendar">
        {days.map((date) => {
          const dayBlocks = blocks.filter((block) => localDate(block.startsAt) === date);
          return (
            <article className="calendar-day" key={date}>
              <header>
                <strong>{dayLabel(date)}</strong>
                <span>{dayBlocks.length} blocks</span>
              </header>

              <div className="calendar-lanes">
                {["1F", "B1"].map((spaceCode) => {
                  const laneBlocks = dayBlocks.filter(
                    (block) => spaceCodeById.get(block.spaceId) === spaceCode,
                  );
                  return (
                    <div className="calendar-lane" key={spaceCode}>
                      <div className="calendar-space-code">{spaceCode}</div>
                      <div className="calendar-block-list">
                        {laneBlocks.length === 0 ? (
                          <span className="calendar-empty">예약 가능</span>
                        ) : null}
                        {laneBlocks.map((block) => {
                          const manual =
                            !block.bookingId &&
                            (block.type === "internal" || block.type === "maintenance");
                          return (
                            <div className={`calendar-block block-${block.type}`} key={block.id}>
                              <div>
                                <span>{time(block.startsAt)}–{time(block.endsAt)}</span>
                                <strong>{block.title}</strong>
                              </div>
                              <div className="calendar-block-side">
                                <em>{block.type}</em>
                                {manual ? (
                                  <form action={cancelManualBlockAction}>
                                    <input type="hidden" name="blockId" value={block.id} />
                                    <button className="calendar-remove" type="submit">해제</button>
                                  </form>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <p className="fine-print calendar-footnote">
        하루를 넘기는 블록은 시작일 기준으로 표시됩니다. 실제 충돌 판정은 화면 표시와 별개로 전체 timestamptz 범위에서 수행됩니다.
      </p>
    </div>
  );
}
