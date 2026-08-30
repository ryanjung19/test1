import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "대관 예약 | Vassment One",
  description: "Vassment One 1F / B1 대관 가능 일정 확인 및 문의",
};

export default function ReserveLayout({ children }: { children: ReactNode }) {
  return children;
}
