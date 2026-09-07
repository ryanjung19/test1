"use client";

import { Menu, Search, Ticket, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const nav = [
  ["/", "Home"],
  ["/#projects", "Projects"],
  ["/#creators", "Creators"],
  ["/work", "Work with us"]
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8 md:pt-6">
        <div className="frosted mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,.06)] md:px-6">
          <Link href="/" className="flex items-end gap-2">
            <span className="text-[21px] font-black tracking-[-0.08em]">MEET<span className="text-[#ff8db4]">SET</span></span>
            <span className="hidden pb-[2px] text-[9px] font-semibold uppercase tracking-[0.22em] text-black/40 sm:block">Fan Meets Real Moments</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            {nav.map(([href, label]) => <Link key={href + label} href={href} className="transition-opacity hover:opacity-50">{label}</Link>)}
          </nav>

          <div className="flex items-center gap-2">
            <button aria-label="Search" className="grid size-10 place-items-center rounded-full transition hover:bg-black/5"><Search size={18} /></button>
            <Link href="/my" className="hidden rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] sm:flex"><Ticket size={16} className="mr-2" />My tickets</Link>
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-full md:hidden"><Menu size={20} /></button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] bg-black/30 p-3 backdrop-blur-md md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="ml-auto flex h-full w-[88%] max-w-sm flex-col rounded-[32px] bg-[#fffdfb] p-5 soft-shadow">
              <div className="mb-12 flex items-center justify-between">
                <span className="text-2xl font-black tracking-[-0.08em]">MEET<span className="text-[#ff8db4]">SET</span></span>
                <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
              </div>
              <div className="flex flex-col gap-1">
                {nav.map(([href, label], index) => (
                  <motion.div key={href + label} initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * .04 }}>
                    <Link onClick={() => setOpen(false)} href={href} className="block border-b border-black/10 py-4 text-3xl font-semibold tracking-[-0.05em]">{label}</Link>
                  </motion.div>
                ))}
              </div>
              <Link onClick={() => setOpen(false)} href="/my" className="mt-auto rounded-full bg-[#ffb9cf] px-6 py-4 text-center font-bold">Open my tickets</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
