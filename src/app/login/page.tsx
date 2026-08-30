"use client";

import { useState, type FormEvent } from "react";

import styles from "./login.module.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (data.error === "auth_not_configured") {
          setError("관리자 인증 환경변수가 아직 설정되지 않았습니다.");
        } else {
          setError("비밀번호가 올바르지 않습니다.");
        }
        return;
      }

      window.location.assign("/");
    } catch {
      setError("로그인 요청을 처리할 수 없습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.mark}>V1</div>
          <div>
            <strong>VASSMENT ONE</strong>
            <span>Booking OS</span>
          </div>
        </div>

        <h1>관리자 로그인</h1>
        <p className={styles.copy}>
          예약·고객·결제 운영 화면은 관리자 세션이 있는 경우에만 접근할 수 있습니다.
        </p>

        <form className={styles.form} onSubmit={submit}>
          <label htmlFor="admin-password">관리자 비밀번호</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <div className={styles.error}>{error}</div> : null}
          <button disabled={submitting || !password} type="submit">
            {submitting ? "확인 중" : "Booking OS 열기"}
          </button>
        </form>

        <p className={styles.note}>
          초기 버전은 단일 관리자 비밀번호 방식입니다. 운영 인원이 늘어나면 member/RBAC 기반 계정 로그인으로 교체합니다.
        </p>
      </section>
    </main>
  );
}
