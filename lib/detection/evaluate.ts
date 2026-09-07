import type { MarketSnapshot } from "@/lib/market/types";

export type DetectionThresholds = {
  minChangePct: number;
  minVolumeMultiple: number;
  minTradingValueKrw?: number;
};

export type DetectionResult = {
  triggered: boolean;
  matchedRules: number;
  totalRules: number;
  matchRatio: number;
  reasons: string[];
};

export function evaluateMarketMove(
  snapshot: MarketSnapshot,
  thresholds: DetectionThresholds,
): DetectionResult {
  const checks = [
    {
      matched: snapshot.changePct >= thresholds.minChangePct,
      reason: `가격 변동률 ${snapshot.changePct.toFixed(2)}%`,
    },
    {
      matched: snapshot.volumeMultiple >= thresholds.minVolumeMultiple,
      reason: `기준 대비 거래량 ${snapshot.volumeMultiple.toFixed(2)}배`,
    },
  ];

  if (typeof thresholds.minTradingValueKrw === "number") {
    checks.push({
      matched: snapshot.tradingValueKrw >= thresholds.minTradingValueKrw,
      reason: `거래대금 ${snapshot.tradingValueKrw.toLocaleString("ko-KR")}원`,
    });
  }

  const matched = checks.filter((check) => check.matched);

  return {
    triggered: matched.length === checks.length,
    matchedRules: matched.length,
    totalRules: checks.length,
    matchRatio: checks.length === 0 ? 0 : matched.length / checks.length,
    reasons: matched.map((check) => check.reason),
  };
}
