import { isDatabaseConfigured } from "@/db";
import { listScheduleBlocks } from "@/lib/booking/service";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

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
  searchParams: Promise<{ date?: string }>;
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
                        {laneBlocks.map((block) => (
                          <div className={`calendar-block block-${block.type}`} key={block.id}>
                            <div>
                              <span>{time(block.startsAt)}–{time(block.endsAt)}</span>
                              <strong>{block.title}</strong>
                            </div>
                            <em>{block.type}</em>
                          </div>
                        ))}
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
