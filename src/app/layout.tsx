import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Basement One Booking OS",
  description: "Venue lead, sales, booking, calendar and payment operations",
};

const navigation = [
  ["Overview", "/"],
  ["Prospects", "/prospects"],
  ["CRM", "/crm"],
  ["Calendar", "/calendar"],
  ["Bookings", "/bookings"],
  ["Payments", "/payments"],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div>
              <div className="brand-mark">B1</div>
              <div className="brand-copy">
                <strong>BASEMENT ONE</strong>
                <span>Booking OS · v0.1</span>
              </div>
            </div>

            <nav className="nav-list" aria-label="Primary navigation">
              {navigation.map(([label, href]) => (
                <Link key={href} href={href} className="nav-link">
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
      </body>
    </html>
  );
}
