"use client";

import { Home, Sparkles, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#projects", label: "Projects", icon: Sparkles },
  { href: "/work", label: "Creators", icon: Users },
  { href: "/my", label: "My", icon: Ticket }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-4 rounded-[24px] border border-white/60 bg-white/84 p-2 shadow-[0_18px_50px_rgba(0,0,0,.14)] backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || (item.href === "/" && pathname === "/");
        const Icon = item.icon;
        return <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold ${active ? "bg-black text-white" : "text-black/50"}`}><Icon size={17} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
