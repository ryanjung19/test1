import Link from "next/link";

function Logo() {
  return <div className="logo"><span className="logo-mark">SP</span><strong>StockPulse</strong></div>;
}

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Logo />
        <nav>
          <a href="#features">기능</a>
          <a href="#pricing">요금제</a>
          <Link className="ghost" href="/demo">데모 보기</Link>
          <Link className="primary small" href="/auth">로그인 / 시작하기</Link>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">REAL-TIME MARKET MOVE ALERT</div>
            <h1>지금 움직이는 종목을<br /><em>더 빠르게 확인하세요.</em></h1>
            <p>가격·거래량의 이상 움직임을 감지하고 관련 뉴스와 공시를 한 화면에 연결합니다.</p>
            <div className="hero-actions">
              <Link className="primary" href="/auth">계정 만들기 →</Link>
              <Link className="ghost" href="/demo">서비스 화면 보기</Link>
            </div>
            <div className="hero-note">매수·매도 권유가 아닌 시장 정보 탐지 서비스</div>
          </div>

          <div className="phone-card">
            <div className="phone-top"><Logo /><span>DEMO · 10:14</span></div>
            <div className="push-card"><span className="fire">●</span><div><b>급상승 감지</b><strong>종목 A <em>+8.4%</em></strong><p>가격 상승과 거래량 증가가 감지되었습니다.</p></div></div>
            <div className="mini-list"><div><b>종목 B</b><em>+7.1%</em></div><div><b>종목 C</b><em>+6.8%</em></div><div><b>종목 D</b><em>+5.9%</em></div></div>
          </div>
        </section>

        <section id="features" className="feature-strip">
          <article><span>01</span><b>급상승 감지</b><p>가격 변화 속도를 지속적으로 감시</p></article>
          <article><span>02</span><b>거래량 급증</b><p>평균 대비 비정상 거래량을 확인</p></article>
          <article><span>03</span><b>왜 움직이나?</b><p>관련 뉴스와 공시를 한 화면에 연결</p></article>
          <article><span>04</span><b>PC + 모바일 알림</b><p>동일 계정으로 여러 기기에서 확인</p></article>
        </section>

        <section id="pricing" className="simple-pricing">
          <div><span>DEMO</span><h2>먼저 확인해보세요.</h2><p>샘플 데이터로 서비스 화면을 체험합니다.</p><Link className="ghost" href="/demo">데모 보기</Link></div>
          <div className="premium-card"><span>PREMIUM · 준비 중</span><h2>시장 움직임 알림.</h2><p>급상승 감지 · 거래량 급증 · 관련 뉴스/공시<br />요금과 판매 일정은 확정 후 안내합니다.</p><Link className="primary" href="/auth">계정 만들기</Link></div>
        </section>
      </main>
    </div>
  );
}
