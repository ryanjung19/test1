import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "stockpulse",
    version: "0.2.0",
    checkedAt: new Date().toISOString(),
  });
}
