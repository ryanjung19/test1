import "server-only";
import { createClient } from "@/lib/supabase/server";

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503, public readonly code: string) { super(code); }
}

export async function requireMember() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new AccessError(503, "service_unavailable");
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new AccessError(401, "authentication_required");
    return { supabase, user };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(503, "authentication_unavailable");
  }
}

export async function hasPremium(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("has_entitlement");
  if (error) throw new AccessError(503, "entitlement_unavailable");
  return data === true;
}

export async function requirePremium() {
  const member = await requireMember();
  if (!await hasPremium(member.supabase)) throw new AccessError(403, "premium_required");
  return member;
}
