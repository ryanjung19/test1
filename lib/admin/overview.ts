import "server-only";
import { AccessError, requireMember } from "@/lib/auth/access";

export type AdminOverview = {
  members: number;
  activeEntitlements: number;
  pendingWebhooks: number;
  failedPush: number;
  subscriptions: { id: string; provider: string; billing_status: string; current_period_end: string | null }[];
  webhooks: { id: string; provider: string; event_type: string; status: string; received_at: string }[];
  pushDeliveries: { id: string; status: string; provider_status: number | null; attempted_at: string }[];
};
export async function getAdminOverview(): Promise<AdminOverview> {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error?.code === "42501") throw new AccessError(403, "admin_required");
  if (error || !data) throw new AccessError(503, "admin_unavailable");
  return data as AdminOverview;
}
