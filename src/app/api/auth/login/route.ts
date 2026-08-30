import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminAuthConfigured,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/auth/admin-session";

const schema = z.object({
  password: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  try {
    if (!adminAuthConfigured()) {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }

    const payload = schema.parse(await request.json());
    if (!verifyAdminPassword(payload.password)) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
