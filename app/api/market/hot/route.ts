import { getMarketDataAdapter } from "@/lib/market/provider";
import { requirePremium } from "@/lib/auth/access";
import { failure, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePremium();
    const { mode, adapter } = getMarketDataAdapter();
    const items = await adapter.getHotMoves();
    return json({ mode, source: mode === "demo" ? "demo-fixture" : "unknown", asOf: new Date().toISOString(), items });
  } catch (error) { return failure(error); }
}
