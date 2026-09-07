export type Market = "KOSPI" | "KOSDAQ";

export type MarketSnapshot = {
  code: string;
  name: string;
  market: Market;
  price: number;
  changePct: number;
  volumeMultiple: number;
  tradingValueKrw: number;
  observedAt: string;
};

export type HotMove = MarketSnapshot & {
  detectedAt: string;
  reasons: string[];
};

export interface MarketDataAdapter {
  getHotMoves(): Promise<HotMove[]>;
  getSnapshot(code: string): Promise<MarketSnapshot | null>;
}
