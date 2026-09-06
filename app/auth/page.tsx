"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import styles from "./auth.module.css";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  async function handleOAuth(provider: "google" | "kakao") {
    if (!configured) {
      setMessage("Supabase 프로젝트 연결 후 소셜 로그인이 활성화됩니다.");
      return;
    }

    setBusy(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured) {
      setMessage("Supabase 프로젝트 URL과 Publishable Key를 먼저 설정해야 합니다.");
      return;
    }

    setBusy(true);
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("가입 확인 메일을 보냈습니다. 메일의 인증 링크를 확인하세요.");
      }
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    window.location.assign("/account");
  }

  async function handleMagicLink() {
    if (!configured) {
      setMessage("Supabase 프로젝트 연결 후 이메일 링크 로그인이 활성화됩니다.");
      return;
    }
    if (!email) {
      setMessage("이메일 주소를 먼저 입력하세요.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setMessage(error ? error.message : "로그인 링크를 이메일로 보냈습니다.");
    setBusy(false);
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <Link href="/" className={styles.back}>← StockPulse</Link>
        <div className={styles.logo}><span>SP</span><b>StockPulse</b></div>
        <p className={styles.eyebrow}>REAL-TIME MARKET MOVE ALERT</p>
        <h1>{mode === "login" ? "다시 오셨네요." : "무료 계정을 만드세요."}</h1>
        <p className={styles.lead}>하나의 계정으로 PC와 모바일에서 급상승 알림을 확인합니다.</p>

        {!configured && (
          <div className={styles.notice}>
            <b>AUTH 연동 대기</b>
            <span>현재 코드는 준비됐으며 Supabase 프로젝트 키 입력 후 실제 회원가입이 활성화됩니다.</span>
          </div>
        )}

        <div className={styles.socials}>
          <button type="button" className={styles.kakao} disabled={busy} onClick={() => handleOAuth("kakao")}>카카오로 계속하기</button>
          <button type="button" className={styles.google} disabled={busy} onClick={() => handleOAuth("google")}>Google로 계속하기</button>
        </div>

        <div className={styles.divider}><span>또는 이메일</span></div>

        <form onSubmit={handleEmail} className={styles.form}>
          <label>
            이메일
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </label>
          <label>
            비밀번호
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" />
          </label>
          <button className={styles.primary} disabled={busy} type="submit">{busy ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}</button>
          {mode === "login" && <button type="button" className={styles.magic} disabled={busy} onClick={handleMagicLink}>비밀번호 대신 이메일 링크 받기</button>}
        </form>

        {message && <p className={styles.message}>{message}</p>}

        <button className={styles.switcher} type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "처음이신가요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>

        <p className={styles.legal}>StockPulse는 매수·매도 권유가 아닌 시장 움직임 탐지 정보를 제공합니다.</p>
      </section>
    </main>
  );
}
