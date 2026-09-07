import type { Metadata } from "next";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEETSET — Fan Meets Real Moments",
  description: "Premium fan meetings, photo events and live projects by J&Company.",
  openGraph: {
    title: "MEETSET",
    description: "Fan Meets Real Moments",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <MobileNav />
      </body>
    </html>
  );
}
