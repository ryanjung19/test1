import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarketDashboard from "./market-dashboard";
import Link from "next/link";
import { hasPremium } from "@/lib/auth/access";

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

  try {
    if (await hasPremium(supabase)) return <MarketDashboard userEmail={user.email ?? "member"} />;
  } catch {
    return <main className="legal-page"><h1>이용권 확인이 지연되고 있습니다.</h1><p>잠시 후 다시 시도해 주세요.</p><Link href="/account">내 계정</Link></main>;
  }
  return <main className="legal-page"><Link href="/">StockPulse</Link><h1>유료 구독 이용권이 필요합니다.</h1><p>가입만으로 전체 시장 데이터가 제공되지는 않습니다. 현재 유료 구독은 준비 중이며, 샘플 화면을 미리 체험할 수 있습니다.</p><div className="control-actions"><Link className="primary" href="/demo">DEMO 보기</Link><Link className="ghost" href="/account">내 계정</Link></div></main>;
}
