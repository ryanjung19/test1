"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-[72px] md:pt-[78px]">
      <div className="relative min-h-[610px] w-full overflow-hidden bg-[#111] md:min-h-[760px]">
        <Image
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=2200&q=94"
          alt="Featured MEETSET creator"
          fill
          priority
          className="object-cover object-[58%_38%] md:object-[62%_40%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,12,.78)_0%,rgba(8,8,12,.58)_27%,rgba(8,8,12,.12)_58%,rgba(8,8,12,.12)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[610px] max-w-[1480px] flex-col justify-center px-6 pb-20 pt-20 text-white md:min-h-[760px] md:px-10 md:pb-24">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .7 }} className="max-w-[680px]">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.23em] text-white/80 md:text-[13px]">Special fan meeting</p>
            <h1 className="max-w-[640px] text-[62px] font-light leading-[.9] tracking-[-0.065em] sm:text-[74px] md:text-[98px] lg:text-[112px]">
              Closer<br />Than <span className="text-[#ffc2d5]">Ever</span>
            </h1>
            <p className="mt-6 text-base font-medium tracking-[-0.02em] text-white/88 md:text-lg">가까운 순간이, 더 특별해지니까.</p>
            <Link href="/projects/serin-black-night" className="mt-8 inline-flex items-center gap-8 rounded-full bg-[#ff8db4] px-6 py-3.5 text-sm font-bold text-black shadow-[0_12px_30px_rgba(255,141,180,.25)] transition hover:-translate-y-0.5">
              View Project <ArrowRight size={17} />
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .5, duration: .8 }} className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-5 text-[10px] text-white/62">
            <span className="h-[2px] w-10 bg-[#ff8db4]" />
            <span className="text-white">01</span>
            <span>02</span>
            <span>03</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .45, duration: .7 }} className="absolute bottom-8 right-8 hidden text-right md:block">
            <p className="font-serif text-3xl italic leading-[.95] text-[#ff9fbd]">Real<br />Moments<br />Together</p>
            <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.17em] text-white/55">MEETSET<br />FAN EXPERIENCES</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
