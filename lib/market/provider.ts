import type { MarketDataAdapter } from "@/lib/market/types";
import { DemoMarketDataAdapter } from "@/lib/market/demo-adapter";

export type MarketProviderMode = "demo";

export function getMarketDataAdapter(): { mode: MarketProviderMode; adapter: MarketDataAdapter } {
  // Production providers will be selected here after licensing/API contracts are confirmed.
  return {
    mode: "demo",
    adapter: new DemoMarketDataAdapter(),
  };
}
