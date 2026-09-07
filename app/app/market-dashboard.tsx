"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type HotMove = {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  price: number;
  changePct: number;
  volumeMultiple: number;
  tradingValueKrw: number;
  observedAt: string;
  detectedAt: string;
  reasons: string[];
};

type Payload = {
  mode: "demo" | string;
  source: string;
  asOf: string;
  items: HotMove[];
};

export default function MarketDashboard({ userEmail }: { userEmail: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [market, setMarket] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [sort, setSort] = useState<"change" | "volume">("change");

  useEffect(() => {
    let active = true;

    fetch("/api/market/hot", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Payload>;
      })
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "데이터를 불러오지 못했습니다.");
      });

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const source = payload?.items ?? [];
    const filtered = market === "ALL" ? [...source] : source.filter((item) => item.market === market);
    filtered.sort((a, b) => sort === "change" ? b.changePct - a.changePct : b.volumeMultiple - a.volumeMultiple);
    return filtered;
  }, [payload, market, sort]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo"><span className="logo-mark">SP</span><strong>StockPulse</strong></div>
        <div className="demo-badge">{payload?.mode === "demo" ? "DEMO DATA" : "LIVE DATA"}</div>
        <nav className="side-nav">
          <button className="active"><span>↗</span>급상승</button>
          <Link href="/account" className="sidebar-link"><span>◎</span>내 계정</Link>
          <Link href="/demo" className="sidebar-link"><span>◫</span>전체 데모</Link>
        </nav>
        <div className="sidebar-bottom">
          <p>{userEmail}<br />회원 세션 연결됨</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="mobile-logo"><div className="logo"><span className="logo-mark">SP</span><strong>StockPulse</strong></div></div>
          <div className="searchbox">⌕ <span>종목 검색 · 다음 단계에서 연결</span></div>
          <div className="top-actions"><Link className="profile" href="/account"><span>{userEmail.slice(0, 1).toUpperCase()}</span><b>ACCOUNT</b></Link></div>
        </header>

        <section className="content-area">
          <div className="page-heading">
            <div><div className="eyebrow dark">MEMBER DASHBOARD</div><h1>지금 급상승</h1><p>가격·거래량 이상 움직임을 감지한 종목입니다.</p></div>
            <div className="live-pill"><span /> {payload ? "데이터 연결됨" : "불러오는 중"}</div>
          </div>

          <div className="signal-banner">
            <div><b>{payload?.mode === "demo" ? "현재는 데모 Market Adapter를 사용합니다." : "시장 데이터가 연결되어 있습니다."}</b><p>실제 공급자 계약 후 Adapter만 교체하면 같은 화면을 그대로 사용합니다.</p></div>
            <span>{payload?.source ?? "LOADING"}</span>
          </div>

          <div className="filterbar">
            <div>{(["ALL", "KOSPI", "KOSDAQ"] as const).map((item) => <button key={item} className={market === item ? "active" : ""} onClick={() => setMarket(item)}>{item === "ALL" ? "전체" : item}</button>)}</div>
            <div><button className={sort === "change" ? "active" : ""} onClick={() => setSort("change")}>등락률순</button><button className={sort === "volume" ? "active" : ""} onClick={() => setSort("volume")}>거래량순</button></div>
          </div>

          {error && <div className="signal-banner"><div><b>시장 데이터를 불러오지 못했습니다.</b><p>{error}</p></div><span>ERROR</span></div>}

          {!payload && !error ? <div className="panel"><p>급상승 데이터를 불러오는 중입니다...</p></div> : (
            <div className="stock-table-wrap">
              <div className="stock-table desktop-table">
                <div className="tr th"><span>순위</span><span>종목</span><span>현재가</span><span>등락률</span><span>거래량 증가</span><span>거래대금</span><span>감지</span></div>
                {rows.map((stock, index) => <div className="tr" key={stock.code}><span className={`rank rank-${index + 1}`}>{index + 1}</span><span className="stock-name"><b>{stock.name}</b><small>{stock.code} · {stock.market}</small></span><span>{stock.price.toLocaleString("ko-KR")}원</span><span className="rise">+{stock.changePct}%</span><span><b>{stock.volumeMultiple.toFixed(1)}×</b></span><span>{Math.round(stock.tradingValueKrw / 100_000_000).toLocaleString("ko-KR")}억</span><span className="muted">{new Date(stock.detectedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span></div>)}
              </div>

              <div className="mobile-stock-list">
                {rows.map((stock, index) => <article className="mobile-stock-card" key={stock.code}><div className="row"><span className={`rank rank-${index + 1}`}>{index + 1}</span><div className="stock-name"><b>{stock.name}</b><small>{stock.market} · {stock.code}</small></div><div className="price-right"><b>{stock.price.toLocaleString("ko-KR")}</b><em>+{stock.changePct}%</em></div></div><div className="stock-meta"><span>거래량 <b>{stock.volumeMultiple.toFixed(1)}×</b></span><span>거래대금 <b>{Math.round(stock.tradingValueKrw / 100_000_000).toLocaleString("ko-KR")}억</b></span></div></article>)}
              </div>
            </div>
          )}

          {payload && <p className="hero-note">기준 시각: {new Date(payload.asOf).toLocaleString("ko-KR")} · 출처: {payload.source}</p>}
        </section>
      </main>
    </div>
  );
}
