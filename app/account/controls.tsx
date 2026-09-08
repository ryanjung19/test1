"use client";

import Link from "next/link";
import { useState } from "react";

export default function AccountControls({ versions }: { versions: { terms: string; privacy: string } }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState({ terms: false, privacy: false });

  async function saveConsent(type: "terms" | "privacy") {
    setBusy(true);
    try {
      const response = await fetch("/api/consents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, version: versions[type], action: "accept" }) });
      if (!response.ok) throw new Error("동의 기록을 저장하지 못했습니다. 문서를 새로 확인해 주세요.");
      setMessage("문서 버전과 동의 시각이 기록되었습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "처리하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function registerPush() {
    setBusy(true);
    let created: PushSubscription | undefined;
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("이 환경은 Push를 지원하지 않습니다. iPhone에서는 홈 화면에 추가한 뒤 시도해 주세요.");
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("기기 알림 서비스 준비 중입니다.");
      if (await Notification.requestPermission() !== "granted") throw new Error("브라우저에서 알림 권한을 허용해 주세요.");
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const previous = await registration.pushManager.getSubscription();
      const binary = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "="));
      const publicKey = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) publicKey[i] = binary.charCodeAt(i);
      const subscription = previous ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      if (!previous) created = subscription;
      const response = await fetch("/api/push/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("기기를 등록하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.");
      setMessage("이 기기가 등록되었습니다. 유효한 이용권이 있는 동안 시장 알림을 받을 수 있습니다.");
    } catch (error) {
      if (created) await created.unsubscribe();
      setMessage(error instanceof Error ? error.message : "알림 등록에 실패했습니다.");
    } finally { setBusy(false); }
  }

  async function removePush() {
    setBusy(true);
    try {
      const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/") : undefined;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
        if (!response.ok) throw new Error("알림 해제에 실패했습니다.");
        await subscription.unsubscribe();
      }
      setMessage("이 기기의 알림을 해제했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "알림 해제에 실패했습니다."); }
    finally { setBusy(false); }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation }) });
      if (response.status === 409) throw new Error("구독 취소와 결제 정산을 먼저 완료해 주세요.");
      if (!response.ok) throw new Error("회원 탈퇴를 완료하지 못했습니다.");
      window.location.assign("/auth?deleted=1");
    } catch (error) { setMessage(error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다."); setBusy(false); }
  }

  return <section className="account-controls">
    <h2>기기 알림</h2><p>이 기기의 알림 수신을 설정합니다.</p>
    <div className="control-actions"><button className="primary small" disabled={busy} onClick={registerPush}>이 기기 알림 등록</button><button className="ghost small" disabled={busy} onClick={removePush}>알림 해제</button></div>
    <h2>문서 및 동의</h2><p>현재 문서는 서비스 준비 단계의 초안입니다.</p>
    {(["terms", "privacy"] as const).map(type => <div className="consent-row" key={type}><label><input type="checkbox" checked={accepted[type]} onChange={event => setAccepted({ ...accepted, [type]: event.target.checked })} /> <Link href={`/legal/${type}`} target="_blank">{type === "terms" ? "서비스 이용약관" : "개인정보 처리 안내"}</Link>를 확인하고 동의합니다.</label><button className="ghost small" disabled={busy || !accepted[type]} onClick={() => saveConsent(type)}>동의 기록</button></div>)}
    <h2>회원 탈퇴</h2><p>계정과 운영 데이터가 삭제됩니다. 보존 의무가 있는 계약·결제·분쟁 기록은 별도 보관됩니다.</p>
    <label htmlFor="delete-confirmation">탈퇴하려면 DELETE를 입력하세요.</label><input id="delete-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" />
    <button className="danger-ghost" disabled={busy || confirmation !== "DELETE"} onClick={deleteAccount}>회원 탈퇴</button>
    <p role="status">{message}</p>
  </section>;
}
