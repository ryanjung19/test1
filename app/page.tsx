"use client";

import { useMemo, useState } from "react";

type Screen = "landing" | "login" | "hot" | "detail" | "watchlist" | "alerts" | "settings" | "subscription";
type Stock = {
  rank: number;
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  price: number;
  change: number;
  volumeMultiple: number;
  tradingValue: number;
  detected: string;
  reason: string;
};

const stocks: Stock[] = [
  { rank: 1, code: "042660", name: "한화오션", market: "KOSPI", price: 42350, change: 15.8, volumeMultiple: 3.2, tradingValue: 5124, detected: "방금", reason: "가격 상승과 거래량 급증이 동시에 감지되었습니다." },
  { rank: 2, code: "077970", name: "STX엔진", market: "KOSPI", price: 28700, change: 14.2, volumeMultiple: 4.6, tradingValue: 892, detected: "5분 전", reason: "평균 대비 거래량이 빠르게 증가하고 있습니다." },
  { rank: 3, code: "089530", name: "에코프로비엠", market: "KOSDAQ", price: 198500, change: 12.3, volumeMultiple: 2.8, tradingValue: 765, detected: "12분 전", reason: "단기 가격 변동 폭 확대가 감지되었습니다." },
  { rank: 4, code: "328130", name: "루닛", market: "KOSDAQ", price: 78100, change: 11.9, volumeMultiple: 2.5, tradingValue: 652, detected: "18분 전", reason: "가격과 거래대금이 동시에 확대되고 있습니다." },
  { rank: 5, code: "329180", name: "HD현대중공업", market: "KOSPI", price: 312000, change: 10.6, volumeMultiple: 2.2, tradingValue: 421, detected: "24분 전", reason: "단기 상승 속도가 평소 범위를 벗어났습니다." },
  { rank: 6, code: "196170", name: "알테오젠", market: "KOSDAQ", price: 418500, change: 9.8, volumeMultiple: 2.1, tradingValue: 398, detected: "31분 전", reason: "거래량과 상승률 조건이 동시에 충족되었습니다." },
];

const navItems: { screen: Screen; label: string; icon: string }[] = [
  { screen: "hot", label: "급상승", icon: "↗" },
  { screen: "watchlist", label: "관심종목", icon: "☆" },
  { screen: "alerts", label: "알림", icon: "◉" },
  { screen: "settings", label: "설정", icon: "⚙" },
];

function formatWon(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [selected, setSelected] = useState<Stock>(stocks[0]);
  const [market, setMarket] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [sort, setSort] = useState<"change" | "volume">("change");
  const [watchlist, setWatchlist] = useState<string[]>(["042660", "328130"]);
  const [alerts, setAlerts] = useState({ rapid: true, volume: true, news: true, quiet: false });

  const filteredStocks = useMemo(() => {
    const rows = market === "ALL" ? [...stocks] : stocks.filter((stock) => stock.market === market);
    rows.sort((a, b) => sort === "change" ? b.change - a.change : b.volumeMultiple - a.volumeMultiple);
    return rows;
  }, [market, sort]);

  const openStock = (stock: Stock) => {
    setSelected(stock);
    setScreen("detail");
  };

  if (screen === "landing") {
    return <Landing onStart={() => setScreen("login")} onDemo={() => setScreen("hot")} />;
  }

  if (screen === "login") {
    return <Login onBack={() => setScreen("landing")} onLogin={() => setScreen("hot")} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="demo-badge">DEMO · 샘플 데이터</div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <button key={item.screen} className={screen === item.screen || (screen === "detail" && item.screen === "hot") ? "active" : ""} onClick={() => setScreen(item.screen)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={screen === "subscription" ? "active" : ""} onClick={() => setScreen("subscription")}>PRO 구독 관리</button>
          <p>실제 투자 추천이 아닌<br />시장 움직임 탐지 UI 시제품</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="mobile-logo"><Logo /></div>
          <div className="searchbox">⌕ <span>종목명, 종목코드 검색</span></div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setScreen("alerts")}>●</button>
            <button className="profile" onClick={() => setScreen("subscription")}><span>김</span><b>PREMIUM</b></button>
          </div>
        </header>

        <section className="content-area">
          {screen === "hot" && (
            <HotScreen stocks={filteredStocks} market={market} setMarket={setMarket} sort={sort} setSort={setSort} onOpen={openStock} />
          )}
          {screen === "detail" && (
            <DetailScreen stock={selected} watched={watchlist.includes(selected.code)} onToggleWatch={() => setWatchlist((prev) => prev.includes(selected.code) ? prev.filter((code) => code !== selected.code) : [...prev, selected.code])} onBack={() => setScreen("hot")} />
          )}
          {screen === "watchlist" && (
            <WatchlistScreen stocks={stocks.filter((stock) => watchlist.includes(stock.code))} onOpen={openStock} />
          )}
          {screen === "alerts" && <AlertsScreen onOpen={openStock} />}
          {screen === "settings" && <SettingsScreen alerts={alerts} setAlerts={setAlerts} />}
          {screen === "subscription" && <SubscriptionScreen />}
        </section>
      </main>

      <nav className="mobile-nav">
        {navItems.map((item) => (
          <button key={item.screen} className={screen === item.screen || (screen === "detail" && item.screen === "hot") ? "active" : ""} onClick={() => setScreen(item.screen)}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Logo() {
  return <div className="logo"><span className="logo-mark">SP</span><strong>StockPulse</strong></div>;
}

function Landing({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return (
    <div className="landing">
      <header className="landing-header"><Logo /><nav><a href="#features">기능</a><a href="#pricing">요금제</a><button className="ghost" onClick={onDemo}>데모 보기</button><button className="primary small" onClick={onStart}>시작하기</button></nav></header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">REAL-TIME MARKET MOVE ALERT</div>
            <h1>지금 움직이는 종목을<br /><em>더 빠르게 확인하세요.</em></h1>
            <p>가격·거래량의 이상 움직임을 감지하고 관련 뉴스와 공시를 한 화면에 연결합니다.</p>
            <div className="hero-actions"><button className="primary" onClick={onStart}>무료로 시작하기 →</button><button className="ghost" onClick={onDemo}>서비스 화면 보기</button></div>
            <div className="hero-note">매수·매도 권유가 아닌 시장 정보 탐지 서비스</div>
          </div>
          <div className="phone-card">
            <div className="phone-top"><Logo /><span>10:14</span></div>
            <div className="push-card"><span className="fire">●</span><div><b>급상승 감지</b><strong>한화오션 <em>+15.8%</em></strong><p>가격 상승과 거래량 급증이 감지되었습니다.</p></div></div>
            <div className="mini-list"><div><b>STX엔진</b><em>+14.2%</em></div><div><b>에코프로비엠</b><em>+12.3%</em></div><div><b>루닛</b><em>+11.9%</em></div></div>
          </div>
        </section>
        <section id="features" className="feature-strip">
          <article><span>01</span><b>급상승 감지</b><p>가격 변화 속도를 실시간 감시</p></article>
          <article><span>02</span><b>거래량 급증</b><p>평균 대비 비정상 거래량 확인</p></article>
          <article><span>03</span><b>왜 움직이나?</b><p>관련 뉴스와 공시를 빠르게 연결</p></article>
          <article><span>04</span><b>즉시 알림</b><p>PC와 모바일에서 같은 계정으로 확인</p></article>
        </section>
        <section id="pricing" className="simple-pricing"><div><span>FREE</span><h2>먼저 확인해보세요.</h2><p>일부 급상승 종목과 기본 시장 화면 제공</p></div><div className="premium-card"><span>PREMIUM</span><h2>모든 알림을 한 번에.</h2><p>전체 급상승 · 거래량 급증 · 원인 확인 · 알림 이력</p><button className="primary" onClick={onStart}>시작하기</button></div></section>
      </main>
    </div>
  );
}

function Login({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  return (
    <div className="login-page">
      <button className="back-link" onClick={onBack}>← 처음으로</button>
      <div className="login-card">
        <Logo />
        <h1>시장 움직임을<br />빠르게 확인하세요.</h1>
        <p>하나의 계정으로 PC와 모바일에서 사용할 수 있습니다.</p>
        <button className="kakao" onClick={onLogin}>카카오로 계속하기</button>
        <button className="social" onClick={onLogin}>G&nbsp;&nbsp; Google로 계속하기</button>
        <div className="divider"><span>또는</span></div>
        <label>이메일<input type="email" placeholder="name@example.com" /></label>
        <label>비밀번호<input type="password" placeholder="••••••••" /></label>
        <button className="primary wide" onClick={onLogin}>로그인</button>
        <small>데모에서는 실제 계정이 생성되지 않습니다.</small>
      </div>
    </div>
  );
}

function HotScreen({ stocks, market, setMarket, sort, setSort, onOpen }: { stocks: Stock[]; market: "ALL" | "KOSPI" | "KOSDAQ"; setMarket: (v: "ALL" | "KOSPI" | "KOSDAQ") => void; sort: "change" | "volume"; setSort: (v: "change" | "volume") => void; onOpen: (stock: Stock) => void }) {
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow dark">LIVE MARKET</div><h1>지금 급상승</h1><p>가격·거래량 이상 움직임을 감지한 종목입니다.</p></div><div className="live-pill"><span /> 장중 감지 중</div></div>
      <div className="signal-banner"><div><b>급상승 종목을 자동 감지하고 있습니다.</b><p>현재 화면의 숫자는 UI 검증을 위한 샘플 데이터입니다.</p></div><span>DEMO</span></div>
      <div className="filterbar"><div>{(["ALL", "KOSPI", "KOSDAQ"] as const).map((item) => <button key={item} className={market === item ? "active" : ""} onClick={() => setMarket(item)}>{item === "ALL" ? "전체" : item}</button>)}</div><div><button className={sort === "change" ? "active" : ""} onClick={() => setSort("change")}>등락률순</button><button className={sort === "volume" ? "active" : ""} onClick={() => setSort("volume")}>거래량순</button></div></div>
      <div className="stock-table-wrap">
        <div className="stock-table desktop-table"><div className="tr th"><span>순위</span><span>종목</span><span>현재가</span><span>등락률</span><span>거래량 증가</span><span>거래대금</span><span>감지</span></div>{stocks.map((stock, index) => <button className="tr" key={stock.code} onClick={() => onOpen(stock)}><span className={`rank rank-${index + 1}`}>{index + 1}</span><span className="stock-name"><b>{stock.name}</b><small>{stock.code} · {stock.market}</small></span><span>{formatWon(stock.price)}원</span><span className="rise">+{stock.change}%</span><span><b>{stock.volumeMultiple.toFixed(1)}×</b></span><span>{formatWon(stock.tradingValue)}억</span><span className="muted">{stock.detected}</span></button>)}</div>
        <div className="mobile-stock-list">{stocks.map((stock, index) => <button className="mobile-stock-card" key={stock.code} onClick={() => onOpen(stock)}><div className="row"><span className={`rank rank-${index + 1}`}>{index + 1}</span><div className="stock-name"><b>{stock.name}</b><small>{stock.market} · {stock.code}</small></div><div className="price-right"><b>{formatWon(stock.price)}</b><em>+{stock.change}%</em></div></div><div className="stock-meta"><span>거래량 <b>{stock.volumeMultiple.toFixed(1)}×</b></span><span>거래대금 <b>{formatWon(stock.tradingValue)}억</b></span><span>{stock.detected}</span></div></button>)}</div>
      </div>
    </>
  );
}

function DetailScreen({ stock, watched, onToggleWatch, onBack }: { stock: Stock; watched: boolean; onToggleWatch: () => void; onBack: () => void }) {
  return (
    <>
      <button className="back-link inside" onClick={onBack}>← 급상승 목록</button>
      <div className="detail-head"><div><div className="ticker-line"><span>{stock.market}</span><span>{stock.code}</span></div><h1>{stock.name}</h1><div className="headline-price"><strong>{formatWon(stock.price)}원</strong><em>+{stock.change}%</em></div><p>마지막 감지 · {stock.detected}</p></div><button className="watch-button" onClick={onToggleWatch}>{watched ? "★ 관심종목" : "☆ 관심종목 추가"}</button></div>
      <div className="detail-grid">
        <article className="panel chart-panel"><div className="panel-title"><div><span>오늘 가격 움직임</span><small>샘플 차트</small></div><span className="live-pill compact"><i />LIVE</span></div><svg viewBox="0 0 600 220" className="chart" role="img" aria-label="샘플 가격 상승 차트"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4d57" stopOpacity="0.25"/><stop offset="100%" stopColor="#ef4d57" stopOpacity="0"/></linearGradient></defs><path d="M15 182 L65 167 L100 170 L135 143 L180 151 L218 113 L258 125 L300 88 L350 101 L389 69 L430 83 L474 47 L520 58 L578 24 L578 210 L15 210 Z" fill="url(#area)"/><polyline points="15,182 65,167 100,170 135,143 180,151 218,113 258,125 300,88 350,101 389,69 430,83 474,47 520,58 578,24" fill="none" stroke="#ef4d57" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="578" cy="24" r="7" fill="#ef4d57"/></svg><div className="chart-axis"><span>09:00</span><span>10:30</span><span>12:00</span><span>13:30</span><span>15:30</span></div></article>
        <article className="panel why-panel"><div className="panel-title"><div><span>왜 움직이나?</span><small>자동 수집 정보 요약 영역</small></div></div><div className="reason-box"><span>01</span><div><b>가격·거래량 동시 상승</b><p>{stock.reason}</p></div></div><div className="reason-box"><span>02</span><div><b>관련 뉴스 발견</b><p>급격한 움직임 직전 공개된 관련 기사를 연결합니다.</p></div></div><div className="reason-box"><span>03</span><div><b>공시 확인</b><p>DART 연동 후 관련 공시 여부를 자동 표시합니다.</p></div></div></article>
      </div>
      <div className="metrics"><div><small>등락률</small><b className="rise">+{stock.change}%</b></div><div><small>거래량 증가</small><b>{stock.volumeMultiple.toFixed(1)}×</b></div><div><small>거래대금</small><b>{formatWon(stock.tradingValue)}억</b></div><div><small>감지 시각</small><b>{stock.detected}</b></div></div>
      <div className="detail-grid lower"><article className="panel"><div className="panel-title"><span>관련 뉴스</span><button>전체 보기</button></div><div className="news-row"><div><b>관련 산업 및 기업 이슈 기사 제목이 표시됩니다.</b><small>뉴스 데이터 연동 예정 · 8분 전</small></div><span>→</span></div><div className="news-row"><div><b>가격 움직임 전후의 주요 기사를 시간순으로 연결합니다.</b><small>뉴스 데이터 연동 예정 · 24분 전</small></div><span>→</span></div></article><article className="panel"><div className="panel-title"><span>DART 공시</span><button>OpenDART 연결 예정</button></div><div className="disclosure"><span>공시 발생 여부</span><b>데이터 연동 전</b><p>실서비스에서는 종목코드 기준으로 최신 공시를 자동 조회합니다.</p></div></article></div>
    </>
  );
}

function WatchlistScreen({ stocks, onOpen }: { stocks: Stock[]; onOpen: (stock: Stock) => void }) {
  return <><div className="page-heading"><div><div className="eyebrow dark">MY STOCKS</div><h1>관심종목</h1><p>관심 있는 종목의 움직임을 한 곳에서 확인합니다.</p></div></div><div className="card-list">{stocks.map((stock) => <button className="list-card" key={stock.code} onClick={() => onOpen(stock)}><div className="stock-name"><b>{stock.name}</b><small>{stock.code} · {stock.market}</small></div><div className="list-stats"><b>{formatWon(stock.price)}원</b><em>+{stock.change}%</em><span>거래량 {stock.volumeMultiple.toFixed(1)}×</span></div><span>→</span></button>)}</div></>;
}

function AlertsScreen({ onOpen }: { onOpen: (stock: Stock) => void }) {
  const rows = [
    { stock: stocks[0], type: "급상승", text: "가격 상승과 거래량 급증이 감지되었습니다.", time: "방금" },
    { stock: stocks[1], type: "거래량 급증", text: "평균 대비 거래량이 빠르게 증가했습니다.", time: "5분 전" },
    { stock: stocks[2], type: "뉴스 동반", text: "시장 움직임과 함께 관련 뉴스가 확인되었습니다.", time: "12분 전" },
    { stock: stocks[3], type: "급상승", text: "단기 가격 변동 폭이 확대되었습니다.", time: "1시간 전" },
  ];
  return <><div className="page-heading"><div><div className="eyebrow dark">ALERT HISTORY</div><h1>알림 내역</h1><p>최근 감지된 시장 움직임을 시간순으로 확인합니다.</p></div><button className="ghost small">모두 읽음</button></div><div className="alert-list">{rows.map((row, index) => <button key={`${row.stock.code}-${index}`} className="alert-row" onClick={() => onOpen(row.stock)}><span className="alert-dot" /><div><div className="alert-top"><b>{row.type}</b><span>{row.time}</span></div><strong>{row.stock.name} <em>+{row.stock.change}%</em></strong><p>{row.text}</p></div><span>→</span></button>)}</div></>;
}

function SettingsScreen({ alerts, setAlerts }: { alerts: { rapid: boolean; volume: boolean; news: boolean; quiet: boolean }; setAlerts: (value: { rapid: boolean; volume: boolean; news: boolean; quiet: boolean }) => void }) {
  const toggle = (key: keyof typeof alerts) => setAlerts({ ...alerts, [key]: !alerts[key] });
  return <><div className="page-heading"><div><div className="eyebrow dark">NOTIFICATIONS</div><h1>알림 설정</h1><p>받고 싶은 시장 움직임만 선택할 수 있습니다.</p></div></div><div className="settings-grid"><article className="panel"><h2>알림 유형</h2><Toggle label="급상승 감지" desc="짧은 시간 동안 가격 움직임이 확대된 종목" checked={alerts.rapid} onClick={() => toggle("rapid")} /><Toggle label="거래량 급증" desc="평균 대비 거래량이 크게 증가한 종목" checked={alerts.volume} onClick={() => toggle("volume")} /><Toggle label="뉴스·공시 동반" desc="시장 움직임과 관련 정보가 함께 발견된 경우" checked={alerts.news} onClick={() => toggle("news")} /></article><article className="panel"><h2>수신 환경</h2><div className="device-card"><span>PC</span><div><b>Chrome / Edge</b><p>브라우저 Push 사용 예정</p></div><em>연결</em></div><div className="device-card"><span>모바일</span><div><b>iPhone / Android</b><p>PWA 설치 후 Push 수신</p></div><em>연결</em></div><Toggle label="야간 알림 끄기" desc="설정 시간에는 알림을 보내지 않습니다." checked={alerts.quiet} onClick={() => toggle("quiet")} /></article></div></>;
}

function Toggle({ label, desc, checked, onClick }: { label: string; desc: string; checked: boolean; onClick: () => void }) {
  return <button className="toggle-row" onClick={onClick}><div><b>{label}</b><p>{desc}</p></div><span className={`toggle ${checked ? "on" : ""}`}><i /></span></button>;
}

function SubscriptionScreen() {
  return <><div className="page-heading"><div><div className="eyebrow dark">ACCOUNT</div><h1>구독 관리</h1><p>현재 플랜과 결제 상태를 확인합니다.</p></div></div><div className="subscription-grid"><article className="panel plan-card"><div className="plan-head"><div><span>PREMIUM</span><h2>프리미엄 구독</h2></div><span className="status">ACTIVE</span></div><div className="plan-info"><div><small>현재 플랜</small><b>Premium</b></div><div><small>결제 금액</small><b>가격 미정 · DEMO</b></div><div><small>다음 결제일</small><b>결제 연동 후 표시</b></div><div><small>결제 수단</small><b>PortOne + Toss 예정</b></div></div><div className="plan-actions"><button className="ghost">결제수단 변경</button><button className="danger-ghost">구독 해지</button></div></article><article className="panel"><h2>계정</h2><div className="account-line"><span>로그인</span><b>demo@stockpulse.kr</b></div><div className="account-line"><span>연결 기기</span><b>PC 1 · 모바일 1</b></div><div className="account-line"><span>회원 상태</span><b>Premium</b></div><button className="ghost wide">개인정보 및 약관 관리</button></article></div></>;
}
