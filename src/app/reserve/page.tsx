"use client";

import { useMemo, useState, type FormEvent } from "react";

import styles from "./reserve.module.css";

type SpaceOption = "1F" | "B1" | "ALL";
type AvailabilityState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "available" }
  | { state: "unavailable" }
  | { state: "error"; message: string };

const spaceOptions: Array<{
  value: SpaceOption;
  title: string;
  description: string;
}> = [
  { value: "1F", title: "1F", description: "팝업 · 촬영 · 브랜드 이벤트" },
  { value: "B1", title: "B1", description: "공연 · 파티 · 프라이빗 이벤트" },
  { value: "ALL", title: "1F + B1", description: "두 층을 연결한 통합 대관" },
];

function datePlusDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function makeRange(date: string, startTime: string, endTime: string) {
  if (!date || !startTime || !endTime) return null;
  const endDate = endTime <= startTime ? datePlusDays(date, 1) : date;

  return {
    from: `${date}T${startTime}:00+09:00`,
    to: `${endDate}T${endTime}:00+09:00`,
  };
}

function humanSpace(option: SpaceOption | null) {
  if (!option) return "미선택";
  return option === "ALL" ? "1F + B1" : option;
}

export default function ReservePage() {
  const [step, setStep] = useState(1);
  const [space, setSpace] = useState<SpaceOption | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("22:00");
  const [availability, setAvailability] = useState<AvailabilityState>({ state: "idle" });

  const [eventType, setEventType] = useState("브랜드 행사 / 팝업");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [budgetBand, setBudgetBand] = useState("");
  const [message, setMessage] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const range = useMemo(
    () => makeRange(date, startTime, endTime),
    [date, startTime, endTime],
  );

  const spaceCodes = useMemo(() => {
    if (!space) return [];
    return space === "ALL" ? (["1F", "B1"] as const) : ([space] as const);
  }, [space]);

  function resetAvailability() {
    setAvailability({ state: "idle" });
  }

  async function checkAvailability() {
    if (!space || !range) return;

    setAvailability({ state: "loading" });
    const params = new URLSearchParams({
      spaces: spaceCodes.join(","),
      from: range.from,
      to: range.to,
    });

    try {
      const response = await fetch(`/api/public/availability?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        available?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "availability_failed");
      }

      setAvailability({ state: data.available ? "available" : "unavailable" });
    } catch {
      setAvailability({
        state: "error",
        message: "현재 실시간 일정을 확인할 수 없습니다. 문의는 계속 접수할 수 있습니다.",
      });
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!space || !range) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          eventType,
          spaceCodes,
          eventStartsAt: range.from,
          eventEndsAt: range.to,
          attendeeCount: attendeeCount ? Number(attendeeCount) : undefined,
          budgetBand: budgetBand || undefined,
          message: message || undefined,
          website,
        }),
      });

      const data = (await response.json()) as {
        reference?: string;
        error?: string;
      };

      if (!response.ok || !data.reference) {
        throw new Error(data.error ?? "submit_failed");
      }

      setReference(data.reference);
    } catch {
      setSubmitError(
        "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 기존 문의 채널을 이용해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className={styles.screen}>
        <div className={styles.frame}>
          <header className={styles.topbar}>
            <div className={styles.brand}>
              <div className={styles.mark}>V1</div>
              <div className={styles.brandText}>
                <strong>VASSMENT ONE</strong>
                <span>Reservation</span>
              </div>
            </div>
          </header>
          <section className={`${styles.panel} ${styles.success}`}>
            <div className={styles.successMark}>✓</div>
            <h2>대관 문의가 접수되었습니다.</h2>
            <p>
              입력하신 일정과 행사 내용을 확인한 뒤 담당자가 연락드립니다.<br />
              아래 문의번호를 보관해 주세요.
            </p>
            <span className={styles.reference}>{reference}</span>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.mark}>V1</div>
            <div className={styles.brandText}>
              <strong>VASSMENT ONE</strong>
              <span>Reservation</span>
            </div>
          </div>
          <span className={styles.topMeta}>대관 가능 일정 확인 · 문의 접수</span>
        </header>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>SPACE RESERVATION</p>
            <h1>대관 일정 확인 및 문의</h1>
          </div>
          <p className={styles.heroCopy}>
            공간과 희망 시간을 먼저 확인한 뒤 행사 정보를 남겨주세요. 공개 화면에서는
            다른 고객의 예약 정보나 내부 HOLD 상태를 표시하지 않습니다.
          </p>
        </section>

        <div className={styles.progress} aria-label="예약 문의 단계">
          {[
            [1, "공간 · 일정"],
            [2, "행사 정보"],
            [3, "담당자 정보"],
          ].map(([number, label]) => (
            <div
              key={number}
              className={`${styles.progressItem} ${step === number ? styles.progressActive : ""}`}
            >
              {number}. {label}
            </div>
          ))}
        </div>

        <div className={styles.layout}>
          <form className={styles.panel} onSubmit={submitInquiry}>
            {step === 1 ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2>공간과 시간을 선택하세요.</h2>
                  <p>날짜와 시간은 서울 시간(Asia/Seoul) 기준입니다.</p>
                </div>

                <div className={styles.spaceGrid}>
                  {spaceOptions.map((option) => (
                    <button
                      className={`${styles.spaceCard} ${space === option.value ? styles.spaceCardSelected : ""}`}
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSpace(option.value);
                        resetAvailability();
                      }}
                    >
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.fieldGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="event-date">희망 날짜</label>
                    <input
                      id="event-date"
                      type="date"
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        resetAvailability();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="start-time">사용 시작</label>
                    <input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(event) => {
                        setStartTime(event.target.value);
                        resetAvailability();
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="end-time">사용 종료</label>
                    <input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(event) => {
                        setEndTime(event.target.value);
                        resetAvailability();
                      }}
                    />
                  </div>
                </div>

                <div className={styles.availabilityBox}>
                  <div className={styles.availabilityText}>
                    <strong
                      className={
                        availability.state === "available"
                          ? styles.statusAvailable
                          : availability.state === "unavailable"
                            ? styles.statusUnavailable
                            : undefined
                      }
                    >
                      {availability.state === "idle" && "실시간 가능 여부를 확인하세요."}
                      {availability.state === "loading" && "일정을 확인하고 있습니다."}
                      {availability.state === "available" && "선택한 시간은 현재 예약 가능합니다."}
                      {availability.state === "unavailable" && "선택한 시간은 바로 예약 확정이 어렵습니다."}
                      {availability.state === "error" && "실시간 확인을 완료하지 못했습니다."}
                    </strong>
                    <span>
                      {availability.state === "unavailable"
                        ? "대체 시간이나 행사 조건을 포함해 문의는 계속 접수할 수 있습니다."
                        : availability.state === "error"
                          ? availability.message
                          : "실제 확정은 담당자 확인 및 HOLD/계약 절차 후 완료됩니다."}
                    </span>
                  </div>
                  <button
                    className={`${styles.button} ${styles.secondary}`}
                    type="button"
                    disabled={!space || !range || availability.state === "loading"}
                    onClick={checkAvailability}
                  >
                    가능 여부 확인
                  </button>
                </div>

                <div className={styles.actions}>
                  <span />
                  <button
                    className={`${styles.button} ${styles.primary}`}
                    type="button"
                    disabled={!space || !range || availability.state === "loading"}
                    onClick={() => setStep(2)}
                  >
                    행사 정보 입력
                  </button>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2>행사 정보를 알려주세요.</h2>
                  <p>정확한 견적과 운영 가능 여부를 판단하기 위한 기본 정보입니다.</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="event-type">행사 유형</label>
                    <select
                      id="event-type"
                      value={eventType}
                      onChange={(event) => setEventType(event.target.value)}
                    >
                      <option>브랜드 행사 / 팝업</option>
                      <option>기업 행사 / 세미나</option>
                      <option>촬영 / 프로덕션</option>
                      <option>공연 / 파티</option>
                      <option>전시</option>
                      <option>기타</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="attendees">예상 인원</label>
                    <input
                      id="attendees"
                      min="1"
                      type="number"
                      inputMode="numeric"
                      placeholder="예: 120"
                      value={attendeeCount}
                      onChange={(event) => setAttendeeCount(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="budget">예상 예산</label>
                    <select
                      id="budget"
                      value={budgetBand}
                      onChange={(event) => setBudgetBand(event.target.value)}
                    >
                      <option value="">선택 안 함</option>
                      <option value="300만원 미만">300만원 미만</option>
                      <option value="300~500만원">300~500만원</option>
                      <option value="500~1,000만원">500~1,000만원</option>
                      <option value="1,000만원 이상">1,000만원 이상</option>
                    </select>
                  </div>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label htmlFor="message">행사 내용 / 필요한 시설</label>
                    <textarea
                      id="message"
                      placeholder="행사 목적, 준비·철수 시간, 장비·케이터링 등 필요한 내용을 적어주세요."
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={`${styles.button} ${styles.secondary}`}
                    type="button"
                    onClick={() => setStep(1)}
                  >
                    이전
                  </button>
                  <button
                    className={`${styles.button} ${styles.primary}`}
                    type="button"
                    onClick={() => setStep(3)}
                  >
                    담당자 정보 입력
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2>연락받을 정보를 입력하세요.</h2>
                  <p>제출하면 Vassment One Booking OS에 신규 인바운드 문의로 등록됩니다.</p>
                </div>

                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <label htmlFor="company">회사 / 브랜드</label>
                    <input
                      id="company"
                      required
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="contact">담당자명</label>
                    <input
                      id="contact"
                      required
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="email">이메일</label>
                    <input
                      id="email"
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="phone">연락처</label>
                    <input
                      id="phone"
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className={styles.honeypot} aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>
                </div>

                {submitError ? <div className={styles.error}>{submitError}</div> : null}

                <div className={styles.actions}>
                  <button
                    className={`${styles.button} ${styles.secondary}`}
                    type="button"
                    onClick={() => setStep(2)}
                  >
                    이전
                  </button>
                  <button
                    className={`${styles.button} ${styles.primary}`}
                    type="submit"
                    disabled={submitting || !companyName || !contactName || !email || !phone}
                  >
                    {submitting ? "접수 중" : "대관 문의 접수"}
                  </button>
                </div>
              </>
            ) : null}
          </form>

          <aside className={styles.summary} aria-label="선택 내용">
            <h3>선택 내용</h3>
            <dl className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <dt>공간</dt>
                <dd>{humanSpace(space)}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>날짜</dt>
                <dd>{date || "미선택"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>시간</dt>
                <dd>{date ? `${startTime} – ${endTime}` : "미선택"}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>일정 상태</dt>
                <dd>
                  {availability.state === "available"
                    ? "예약 가능"
                    : availability.state === "unavailable"
                      ? "문의 필요"
                      : "미확인"}
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>행사</dt>
                <dd>{eventType}</dd>
              </div>
            </dl>
            <p className={styles.summaryNote}>
              이 화면은 즉시 결제·확정 예약이 아닙니다. 일정 확인 후 견적, HOLD, 계약 및
              결제 절차를 거쳐 최종 확정됩니다.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
