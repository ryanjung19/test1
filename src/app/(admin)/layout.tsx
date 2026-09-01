import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminChrome } from "@/components/app-chrome";
import { hasAdminSession } from "@/lib/auth/admin-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vassment One Booking OS",
  description: "Vassment One venue sales, booking and payment operations",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }

  return <AdminChrome>{children}</AdminChrome>;
}
