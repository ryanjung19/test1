import type { Metadata } from "next";

import "./globals.css";
import "./modules.css";
import "./admin-extra.css";

export const metadata: Metadata = {
  title: "Vassment One",
  description: "Vassment One venue booking and operations",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
