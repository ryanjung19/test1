"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  ["Overview", "/"],
  ["Prospects", "/prospects"],
  ["CRM", "/crm"],
  ["Calendar", "/calendar"],
  ["Bookings", "/bookings"],
  ["Payments", "/payments"],
] as const;

function isPublicBookingPath(pathname: string) {
  return pathname === "/reserve" || pathname.startsWith("/reservation/");
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicBookingPath(pathname)) {
    return <main className="public-main">{children}</main>;
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
          <span className="status-dot" /> Core foundation
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
