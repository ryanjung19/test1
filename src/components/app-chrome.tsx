"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigation = [
  ["Overview", "/"],
  ["Prospects", "/prospects"],
  ["CRM", "/crm"],
  ["Calendar", "/calendar"],
  ["Bookings", "/bookings"],
  ["Payments", "/payments"],
] as const;

export function AdminChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">V1</div>
          <div className="brand-copy">
            <strong>VASSMENT ONE</strong>
            <span>Booking OS · v0.1</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${pathname === href ? " nav-link-active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div><span className="status-dot" /> Admin session</div>
          <button
            className="sidebar-logout"
            type="button"
            disabled={loggingOut}
            onClick={logout}
          >
            {loggingOut ? "종료 중" : "로그아웃"}
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
