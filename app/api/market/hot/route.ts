import { NextResponse } from "next/server";
import { getMarketDataAdapter } from "@/lib/market/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const { mode, adapter } = getMarketDataAdapter();
  const items = await adapter.getHotMoves();

  return NextResponse.json(
    {
      mode,
      source: mode === "demo" ? "demo-fixture" : "unknown",
      asOf: new Date().toISOString(),
      items,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
