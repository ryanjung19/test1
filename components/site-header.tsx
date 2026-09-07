"use client";

import { ChevronDown, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const nav = [
  ["/", "Home"],
  ["/#projects", "Projects"],
  ["/#creators", "Creators"],
  ["/#about", "About"]
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="reference-header fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[62px] max-w-[1480px] items-center justify-between px-5 md:h-[64px] md:px-10">
          <Link href="/" className="flex flex-col leading-none text-white md:text-black">
            <span className="text-[22px] font-black tracking-[-0.085em] md:text-[25px]">MEET<span className="text-[#ff7fa9]">SET</span></span>
            <span className="mt-1 hidden text-[8px] font-semibold tracking-[0.18em] text-black/42 md:block">FAN MEETS REAL MOMENTS</span>
          </Link>

          <nav className="hidden items-center gap-9 text-[12px] font-semibold text-black md:flex">
            {nav.map(([href, label], index) => (
              <Link key={href + label} href={href} className={`relative py-[22px] transition-opacity hover:opacity-50 ${index === 0 ? "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-[#ff7fa9]" : ""}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-white md:gap-4">
            <button aria-label="Search" className="grid size-9 place-items-center rounded-full transition hover:bg-white/10"><Search size={16} /></button>
            <button className="hidden items-center gap-1 text-[11px] font-semibold md:flex">KR <ChevronDown size={12} /></button>
            <Link href="/my" className="hidden text-[11px] font-semibold transition-opacity hover:opacity-60 md:block">Log in</Link>
            <Link href="/work" className="hidden rounded-xl bg-[#ff8db4] px-5 py-3 text-[11px] font-bold text-black shadow-[0_8px_24px_rgba(255,141,180,.22)] transition hover:-translate-y-0.5 md:block">Sign up</Link>
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-full transition hover:bg-white/10 md:hidden"><Menu size={21} /></button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[80] bg-black/30 p-3 backdrop-blur-md md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} className="ml-auto flex h-full w-[88%] max-w-sm flex-col rounded-[28px] bg-white/95 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-black tracking-[-0.085em]">MEET<span className="text-[#ff7fa9]">SET</span></div>
                  <div className="mt-1 text-[9px] tracking-[.18em] text-black/35">FAN MEETS REAL MOMENTS</div>
                </div>
                <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
              </div>
              <div className="flex flex-col">
                {nav.map(([href, label], index) => (
                  <motion.div key={href + label} initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * .04 }}>
                    <Link onClick={() => setOpen(false)} href={href} className="block border-b border-black/10 py-4 text-3xl font-semibold tracking-[-0.05em]">{label}</Link>
                  </motion.div>
                ))}
              </div>
              <Link onClick={() => setOpen(false)} href="/work" className="mt-auto rounded-full bg-[#ff8db4] px-6 py-4 text-center font-bold text-black">Work with MEETSET</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
