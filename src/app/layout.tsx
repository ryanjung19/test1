import type { Metadata } from "next";

import { AppChrome } from "@/components/app-chrome";

import "./globals.css";
import "./modules.css";

export const metadata: Metadata = {
  title: "Vassment One Booking OS",
  description: "Venue lead, sales, booking, calendar and payment operations",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
