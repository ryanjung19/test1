import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./operations.css";

export const metadata: Metadata = {
  title: "StockPulse — 급상승 종목 알림",
  description: "가격·거래량 이상 움직임을 빠르게 감지해 알려주는 시장 알림 서비스",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07111f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
