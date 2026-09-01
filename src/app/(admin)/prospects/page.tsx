import { and, desc, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "@/db";
import { prospects } from "@/db/schema";
import { VASSMENT_ONE } from "@/lib/vassment/constants";

import { createManualProspectAction, reviewProspectAction } from "./actions";

export const dynamic = "force-dynamic";

const statuses = ["new", "reviewed", "approved", "rejected", "converted"] as const;

type ProspectStatus = (typeof statuses)[number];

type PageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
    created?: string;
    updated?: string;
  }>;
};

export default async function ProspectsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const configured = isDatabaseConfigured();
  const requestedStatus = statuses.includes(query.status as ProspectStatus)
    ? (query.status as ProspectStatus)
    : undefined;

  const rows = configured
    ? await db
        .select()
        .from(prospects)
        .where(
          requestedStatus
            ? and(
                eq(prospects.organizationId, VASSMENT_ONE.organizationId),
                eq(prospects.status, requestedStatus),
              )
            : eq(prospects.organizationId, VASSMENT_ONE.organizationId),
        )
        .orderBy(desc(prospects.discoveredAt))
        .limit(300)
    : [];

  const counts = Object.fromEntries(
    statuses.map((status) => [status, rows.filter((row) => row.status === status).length]),
  );

  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">LEAD FINDER · PROSPECT REVIEW</p>
          <h1>대관 가능성이 있는 회사를 영역별로 모으고, 검토된 대상만 CRM으로 넘깁니다.</h1>
          <p className="subcopy">
            외부 탐색기는 웹·SNS·기존 데이터에서 후보와 근거를 수집합니다. Booking OS는 중복제거, 적합도 검토, 승인/제외, CRM 전환을 담당합니다.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary button-link" href="/crm">CRM 열기</a>
        </div>
      </header>

      {!configured ? (
        <div className="admin-alert admin-alert-warning">DATABASE_URL이 설정되지 않아 후보 목록은 미리보기 상태입니다.</div>
      ) : null}
      {query.error ? <div className="admin-alert admin-alert-error">후보 처리 실패: {query.error}</div> : null}
      {query.created ? <div className="admin-alert admin-alert-success">후보를 저장했습니다.</div> : null}
      {query.updated ? <div className="admin-alert admin-alert-success">후보 상태를 반영했습니다.</div> : null}

      <nav className="prospect-filters" aria-label="후보 상태 필터">
        <a className={!requestedStatus ? "prospect-filter-active" : ""} href="/prospects">전체 · {rows.length}</a>
        {statuses.map((status) => (
          <a
            key={status}
            className={requestedStatus === status ? "prospect-filter-active" : ""}
            href={`/prospects?status=${status}`}
          >
            {status} · {counts[status] ?? 0}
          </a>
        ))}
      </nav>

      <details className="panel admin-create-panel">
        <summary>후보 직접 추가</summary>
        <form className="admin-form-grid" action={createManualProspectAction}>
          <label className="admin-field admin-field-wide">
            <span>회사 / 브랜드명</span>
            <input name="companyName" required />
          </label>
          <label className="admin-field">
            <span>영역</span>
            <select name="segment" defaultValue="brand_marketing">
              <option value="brand_marketing">브랜드 마케팅 / 팝업</option>
              <option value="event_agency">행사대행사 / 에이전시</option>
              <option value="production">촬영 / 프로덕션</option>
              <option value="corporate_event">기업 행사</option>
              <option value="exhibition">전시 / 문화</option>
              <option value="music_entertainment">음악 / 엔터테인먼트</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label className="admin-field">
            <span>적합도 0–100</span>
            <input name="fitScore" type="number" min="0" max="100" />
          </label>
          <label className="admin-field">
            <span>출처 유형</span>
            <input name="sourceType" defaultValue="manual" />
          </label>
          <label className="admin-field">
            <span>출처 URL</span>
            <input name="sourceUrl" type="url" />
          </label>
          <label className="admin-field admin-field-wide">
            <span>웹사이트</span>
            <input name="websiteUrl" type="url" />
          </label>
          <label className="admin-field">
            <span>이메일</span>
            <input name="email" type="email" />
          </label>
          <label className="admin-field">
            <span>전화</span>
            <input name="phone" />
          </label>
          <label className="admin-field">
            <span>SNS</span>
            <input name="socialHandle" />
          </label>
          <label className="admin-field admin-field-wide">
            <span>선정 근거</span>
            <textarea name="rationale" rows={3} placeholder="왜 Vassment One의 대관 영업 대상인지 근거를 적습니다." />
          </label>
          <div className="admin-form-actions">
            <button className="button primary" type="submit" disabled={!configured}>후보 저장</button>
          </div>
        </form>
      </details>

      <section className="prospect-list">
        {rows.length === 0 ? <div className="panel admin-empty">조건에 맞는 대관후보가 없습니다.</div> : null}

        {rows.map((prospect) => (
          <article className="prospect-card" key={prospect.id}>
            <div className="prospect-card-header">
              <div>
                <span className={`booking-status prospect-status-${prospect.status}`}>{prospect.status}</span>
                <span className="booking-number">{prospect.segment}</span>
                <h2>{prospect.companyName}</h2>
                <p>{prospect.rationale || "선정 근거 미입력"}</p>
              </div>
              <div className="fit-score">
                <span>FIT</span>
                <strong>{prospect.fitScore ?? "-"}</strong>
                <em>/100</em>
              </div>
            </div>

            <dl className="prospect-meta">
              <div><dt>웹사이트</dt><dd>{prospect.websiteUrl ? <a href={prospect.websiteUrl} target="_blank" rel="noreferrer">열기</a> : "-"}</dd></div>
              <div><dt>이메일</dt><dd>{prospect.email ?? "-"}</dd></div>
              <div><dt>전화</dt><dd>{prospect.phone ?? "-"}</dd></div>
              <div><dt>SNS</dt><dd>{prospect.socialHandle ?? "-"}</dd></div>
              <div><dt>출처</dt><dd>{prospect.sourceUrl ? <a href={prospect.sourceUrl} target="_blank" rel="noreferrer">근거 보기</a> : prospect.sourceType ?? "-"}</dd></div>
            </dl>

            {prospect.status !== "converted" ? (
              <div className="prospect-actions">
                {prospect.status !== "rejected" ? (
                  <form action={reviewProspectAction}>
                    <input type="hidden" name="prospectId" value={prospect.id} />
                    <input type="hidden" name="action" value="rejected" />
                    <button className="button secondary danger-button" type="submit">제외</button>
                  </form>
                ) : null}
                {prospect.status === "new" ? (
                  <form action={reviewProspectAction}>
                    <input type="hidden" name="prospectId" value={prospect.id} />
                    <input type="hidden" name="action" value="reviewed" />
                    <button className="button secondary" type="submit">검토 완료</button>
                  </form>
                ) : null}
                {prospect.status === "new" || prospect.status === "reviewed" ? (
                  <form action={reviewProspectAction}>
                    <input type="hidden" name="prospectId" value={prospect.id} />
                    <input type="hidden" name="action" value="approved" />
                    <button className="button secondary" type="submit">영업대상 승인</button>
                  </form>
                ) : null}
                {prospect.status === "approved" || prospect.status === "reviewed" ? (
                  <form action={reviewProspectAction}>
                    <input type="hidden" name="prospectId" value={prospect.id} />
                    <input type="hidden" name="action" value="convert" />
                    <button className="button primary" type="submit">CRM 리드 생성</button>
                  </form>
                ) : null}
              </div>
            ) : (
              <a className="button secondary button-link" href="/crm">CRM에서 보기</a>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
