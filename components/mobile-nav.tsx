"use client";

import { Home, Sparkles, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", icon: Home },
  { href: "/#projects", label: "프로젝트", icon: Sparkles },
  { href: "/work", label: "크리에이터", icon: Users },
  { href: "/my", label: "MY", icon: Ticket }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[66px] grid-cols-4 border-t border-black/[0.08] bg-white/94 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || (item.href === "/" && pathname === "/");
        const Icon = item.icon;
        return (
          <Link key={item.label} href={item.href} className={`relative flex flex-col items-center justify-center gap-1 text-[9px] font-semibold ${active ? "text-[#e86490]" : "text-black/40"}`}>
            {active ? <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[#ff7fa9]" /> : null}
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
