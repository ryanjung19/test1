const metrics = [
  ["대관후보", "0", "Prospects"],
  ["영업 진행", "0", "Active leads"],
  ["HOLD", "0", "Pending expiry"],
  ["예약 확정", "0", "Confirmed"],
  ["미수금", "₩0", "Outstanding"],
] as const;

const pipeline = [
  ["후보 탐색", "자동/수동 수집", "ready"],
  ["영업", "전화 · 메일 · 카카오 · SNS", "ready"],
  ["견적", "버전별 견적", "ready"],
  ["HOLD", "만료시간 포함", "ready"],
  ["예약 확정", "공간 충돌 방지", "ready"],
  ["결제", "현금 · 카드 · 계좌", "model"],
] as const;

export default function DashboardPage() {
  return (
    <div className="page-wrap">
      <header className="page-header">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h1>대관 영업과 예약을 한 흐름으로 관리합니다.</h1>
          <p className="subcopy">
            후보 탐색 → 접촉 → 견적 → HOLD → 예약 → 결제까지 동일한 고객·일정 데이터로 연결합니다.
          </p>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button">후보 추가</button>
          <button className="button primary" type="button">예약 생성</button>
        </div>
      </header>

      <section className="metric-grid" aria-label="Overview metrics">
        {metrics.map(([label, value, hint]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>

      <div className="content-grid">
        <section className="panel panel-wide">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">TODAY · ASIA/SEOUL</p>
              <h2>공간 일정</h2>
            </div>
            <span className="pill">실데이터 연결 전</span>
          </div>

          <div className="schedule-board">
            <div className="time-axis">
              <span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span>
            </div>
            <div className="space-row">
              <strong>1F</strong>
              <div className="timeline empty-timeline"><span>예약 가능</span></div>
            </div>
            <div className="space-row">
              <strong>B1</strong>
              <div className="timeline empty-timeline"><span>예약 가능</span></div>
            </div>
          </div>
          <p className="fine-print">
            실제 예약은 setup / booking / teardown / hold / internal / maintenance 블록으로 분리 저장됩니다.
          </p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PIPELINE</p>
              <h2>대관 영업 흐름</h2>
            </div>
          </div>
          <div className="pipeline-list">
            {pipeline.map(([label, description, state], index) => (
              <div className="pipeline-row" key={label}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </div>
                <span className={`state state-${state}`}>{state}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="content-grid lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">INTEGRATIONS</p>
              <h2>채널 연결</h2>
            </div>
          </div>
          <ul className="system-list">
            <li><span>기존 챗봇</span><strong>API 준비</strong></li>
            <li><span>전화</span><strong>Interaction 모델 준비</strong></li>
            <li><span>이메일</span><strong>Interaction 모델 준비</strong></li>
            <li><span>카카오채널 / SNS</span><strong>Interaction 모델 준비</strong></li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PAYMENTS</p>
              <h2>결제 설계</h2>
            </div>
          </div>
          <ul className="system-list">
            <li><span>계좌이체 / 현금</span><strong>수동 확인</strong></li>
            <li><span>현장 카드</span><strong>승인내역 등록</strong></li>
            <li><span>온라인 카드</span><strong>Toss 연결 예정</strong></li>
            <li><span>계약금 · 잔금 · 추가금</span><strong>1:N 지원</strong></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
