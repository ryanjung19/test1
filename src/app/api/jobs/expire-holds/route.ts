import { NextResponse } from "next/server";

import { expireDueHolds } from "@/lib/booking/service";
import { verifyAutomationSecret } from "@/lib/integrations/shared-secret";

export async function POST(request: Request) {
  try {
    if (!verifyAutomationSecret(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await expireDueHolds({ limit: 200 });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
