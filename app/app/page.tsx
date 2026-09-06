import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketDashboard from "./market-dashboard";

export const dynamic = "force-dynamic";

export default async function MemberAppPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!configured) {
    redirect("/auth");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <MarketDashboard userEmail={user.email ?? "member"} />;
}
