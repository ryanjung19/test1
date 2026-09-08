import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminOverview, type AdminOverview } from "@/lib/admin/overview";
import { AccessError } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  let overview: AdminOverview;
  try { overview = await getAdminOverview(); }
  catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect("/auth");
    return <main className="legal-page"><Link href="/">← StockPulse</Link><h1>관리자 접근 제한</h1><p>{error instanceof AccessError && error.status === 403 ? "관리자 권한이 있는 계정으로 로그인해 주세요." : "운영 화면을 불러올 수 없습니다. 서비스 연결 상태를 확인해 주세요."}</p></main>;
  }
  return <main className="admin-page"><header><Link href="/app">StockPulse</Link><span>ADMIN · 운영 현황</span><Link href="/account">내 계정</Link></header>
    <h1>서비스 운영 현황</h1><p>구독 이용권, 결제 이벤트와 기기 알림 상태를 확인합니다. 최근 기록은 각 20건입니다.</p>
    <section className="admin-metrics">{[["회원", overview.members], ["유효 이용권", overview.activeEntitlements], ["결제 검증 대기", overview.pendingWebhooks], ["알림 실패·만료", overview.failedPush]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="panel"><h2>구독 상태</h2><div className="admin-table"><table><thead><tr><th>계약</th><th>결제 사업자</th><th>상태</th><th>기간 종료</th></tr></thead><tbody>{overview.subscriptions.map(row => <tr key={row.id}><td>{row.id.slice(0,8)}</td><td>{row.provider}</td><td>{row.billing_status}</td><td>{row.current_period_end ? new Date(row.current_period_end).toLocaleDateString("ko-KR") : "미설정"}</td></tr>)}</tbody></table></div>{!overview.subscriptions.length && <p>구독 기록이 없습니다.</p>}</section>
    <section className="panel"><h2>결제 웹훅</h2><p>검증 대기는 서명 확인 후 결제 내역 대조가 필요한 상태입니다.</p><div className="admin-table"><table><thead><tr><th>사업자</th><th>이벤트</th><th>처리 상태</th><th>접수 시각</th></tr></thead><tbody>{overview.webhooks.map(row => <tr key={row.id}><td>{row.provider}</td><td>{row.event_type}</td><td>{row.status}</td><td>{new Date(row.received_at).toLocaleString("ko-KR")}</td></tr>)}</tbody></table></div>{!overview.webhooks.length && <p>결제 이벤트가 없습니다.</p>}</section>
    <section className="panel"><h2>기기 알림 발송</h2><p>accepted는 Push 사업자 접수이며, 사용자의 실제 열람을 뜻하지 않습니다.</p><div className="admin-table"><table><thead><tr><th>상태</th><th>사업자 응답</th><th>시도 시각</th></tr></thead><tbody>{overview.pushDeliveries.map(row => <tr key={row.id}><td>{row.status}</td><td>{row.provider_status ?? "-"}</td><td>{new Date(row.attempted_at).toLocaleString("ko-KR")}</td></tr>)}</tbody></table></div>{!overview.pushDeliveries.length && <p>발송 기록이 없습니다.</p>}</section>
  </main>;
}
