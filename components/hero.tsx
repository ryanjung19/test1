"use client";

import { ArrowDownRight, Play } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[96vh] overflow-hidden px-4 pb-10 pt-28 md:px-8 md:pt-32">
      <div className="mx-auto grid min-h-[78vh] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <div className="mesh relative flex min-h-[560px] flex-col justify-between overflow-hidden rounded-[36px] bg-[#ffd7e4] p-7 md:p-10 lg:min-h-[720px]">
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .7 }}>
            <div className="mb-10 inline-flex rounded-full border border-black/10 bg-white/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur">Curated fan experiences · Seoul</div>
            <h1 className="display-tight max-w-[760px] text-[18vw] font-black md:text-[11vw] lg:text-[7.6rem]">
              CLOSER<br />THAN<br /><span className="text-white [text-shadow:0_1px_0_rgba(0,0,0,.03)]">EVER.</span>
            </h1>
          </motion.div>

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-base font-medium leading-relaxed text-black/65 md:text-lg">Meet the moment. Keep the memory. MEETSET curates intimate fan meetings, photo events and live projects by J&Company.</p>
            <Link href="#projects" className="group inline-flex items-center gap-4 self-start rounded-full bg-black px-5 py-3 text-sm font-bold text-white">
              Explore projects
              <span className="grid size-9 place-items-center rounded-full bg-white text-black transition-transform group-hover:rotate-[-8deg]"><ArrowDownRight size={17} /></span>
            </Link>
          </div>

          <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .25, duration: .8 }} className="absolute -right-14 top-24 h-[48%] w-[45%] rotate-[8deg] overflow-hidden rounded-[999px_999px_40px_999px] border-[10px] border-white/55 opacity-85 shadow-2xl md:right-6 md:top-12 md:h-[50%] md:w-[36%]">
            <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=90" alt="MEETSET creator" fill priority className="object-cover" />
          </motion.div>
        </div>

        <motion.div initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: .18, duration: .75 }} className="group relative min-h-[460px] overflow-hidden rounded-[36px] bg-black lg:min-h-[720px]">
          <Image src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1500&q=92" alt="Featured fan project" fill priority className="object-cover transition duration-700 group-hover:scale-[1.025]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />
          <div className="absolute left-6 right-6 top-6 flex items-center justify-between md:left-8 md:right-8 md:top-8">
            <span className="rounded-full bg-white/88 px-4 py-2 text-xs font-bold backdrop-blur">FEATURED · ON SALE</span>
            <button className="grid size-11 place-items-center rounded-full bg-white/16 text-white backdrop-blur-lg transition hover:bg-white hover:text-black"><Play size={16} fill="currentColor" /></button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-9">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.19em] text-white/60">Serin · Sep 12 · Seoul</p>
            <h2 className="text-4xl font-semibold tracking-[-0.055em] md:text-6xl">BLACK NIGHT</h2>
            <div className="mt-5 flex items-center justify-between border-t border-white/25 pt-5">
              <span className="text-sm text-white/70">Special Fan Meeting</span>
              <Link href="/projects/serin-black-night" className="rounded-full bg-[#ffb9cf] px-5 py-3 text-sm font-bold text-black">View project</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
