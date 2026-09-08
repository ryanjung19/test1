import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import styles from "./account.module.css";
import { hasPremium } from "@/lib/auth/access";
import AccountControls from "./controls";
import { documents } from "@/lib/consent/documents";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!configured) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <span className={styles.badge}>SETUP REQUIRED</span>
          <h1>Supabase 연결이 필요합니다.</h1>
          <p><code>.env.local</code>에 프로젝트 URL과 Publishable Key를 입력하면 실제 회원 계정 화면이 활성화됩니다.</p>
          <Link href="/auth" className={styles.primary}>로그인 화면으로</Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  let premium = false;
  let entitlementAvailable = true;
  try { premium = await hasPremium(supabase); } catch { entitlementAvailable = false; }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.topline}>
          <Link href="/" className={styles.logo}><span>SP</span><b>StockPulse</b></Link>
          <span className={styles.badge}>{!entitlementAvailable ? "확인 불가" : premium ? "PREMIUM" : "FREE"}</span>
        </div>
        <h1>내 계정</h1>
        <p className={styles.lead}>계정과 서비스 이용권을 확인하고 이 기기의 알림을 관리합니다. DEMO 관심종목은 기기 간 동기화되지 않습니다.</p>

        <dl className={styles.details}>
          <div><dt>이메일</dt><dd>{user.email ?? "-"}</dd></div>
          <div><dt>회원 ID</dt><dd>{user.id}</dd></div>
          <div><dt>서비스 이용권</dt><dd>{!entitlementAvailable ? "잠시 후 다시 확인해 주세요." : premium ? "PREMIUM" : "유료 구독 권한 없음"}</dd></div>
          <div><dt>가입 시각</dt><dd>{profile?.created_at ? new Date(profile.created_at).toLocaleString("ko-KR") : "프로필 생성 대기"}</dd></div>
        </dl>

        <div className={styles.actions}>
          <Link href="/app" className={styles.primary}>서비스 화면으로</Link>
          <form action={signOut}><button type="submit" className={styles.secondary}>로그아웃</button></form>
        </div>
        <AccountControls versions={{ terms: documents.terms.version, privacy: documents.privacy.version }} />
      </section>
    </main>
  );
}
