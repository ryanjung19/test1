import { expect, test } from "vitest";
import { evaluateMarketMove } from "@/lib/detection/evaluate";

test("existing detection requires every configured condition including boundary equality", () => {
  const sample = { code: "DEMO", name: "종목 A", market: "KOSPI" as const, price: 100, changePct: 5, volumeMultiple: 2, tradingValueKrw: 100, observedAt: "2026-09-08T00:00:00Z" };
  const thresholds = { minChangePct: 5, minVolumeMultiple: 2, minTradingValueKrw: 100 };
  expect(evaluateMarketMove(sample, thresholds).triggered).toBe(true);
  expect(evaluateMarketMove({ ...sample, volumeMultiple: 1.99 }, thresholds).triggered).toBe(false);
});
