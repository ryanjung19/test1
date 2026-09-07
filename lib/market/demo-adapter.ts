import type { HotMove, MarketDataAdapter, MarketSnapshot } from "@/lib/market/types";

const demoRows = [
  { code: "042660", name: "한화오션", market: "KOSPI" as const, price: 42350, changePct: 15.8, volumeMultiple: 3.2, tradingValueKrw: 512_400_000_000 },
  { code: "077970", name: "STX엔진", market: "KOSPI" as const, price: 28700, changePct: 14.2, volumeMultiple: 4.6, tradingValueKrw: 89_200_000_000 },
  { code: "089530", name: "에코프로비엠", market: "KOSDAQ" as const, price: 198500, changePct: 12.3, volumeMultiple: 2.8, tradingValueKrw: 76_500_000_000 },
  { code: "328130", name: "루닛", market: "KOSDAQ" as const, price: 78100, changePct: 11.9, volumeMultiple: 2.5, tradingValueKrw: 65_200_000_000 },
];

export class DemoMarketDataAdapter implements MarketDataAdapter {
  async getHotMoves(): Promise<HotMove[]> {
    const now = new Date().toISOString();

    return demoRows.map((row) => ({
      ...row,
      observedAt: now,
      detectedAt: now,
      reasons: ["DEMO: 가격 변동 확대", "DEMO: 거래량 증가"],
    }));
  }

  async getSnapshot(code: string): Promise<MarketSnapshot | null> {
    const row = demoRows.find((item) => item.code === code);
    if (!row) return null;

    return {
      ...row,
      observedAt: new Date().toISOString(),
    };
  }
}
