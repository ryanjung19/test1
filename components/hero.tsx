"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    id: "serin",
    eyebrow: "SPECIAL FAN MEETING",
    titleTop: "Closer",
    titleBottom: "Than",
    accent: "Ever",
    copy: "가까운 순간이, 더 특별해지니까.",
    project: "/projects/serin-black-night",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=2200&q=94",
    position: "object-[58%_28%] md:object-[62%_34%]",
    meta: "SERIN · SEP 12 · SEOUL",
    script: "Real\nMoments\nTogether",
  },
  {
    id: "hayun",
    eyebrow: "PRIVATE PHOTO DAY",
    titleTop: "Own",
    titleBottom: "The",
    accent: "Moment",
    copy: "단 한 번의 장면을, 오래 남는 기억으로.",
    project: "/projects/hayun-private-photo-day",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=2200&q=94",
    position: "object-[52%_22%] md:object-[64%_30%]",
    meta: "HAYUN · SEP 26 · SEOUL",
    script: "One\nFrame\nCloser",
  },
  {
    id: "mina",
    eyebrow: "LIVE PROJECT",
    titleTop: "Hear",
    titleBottom: "It",
    accent: "Closer",
    copy: "무대 위의 순간을, 팬과 더 가까운 거리에서.",
    project: "/projects/mina-fall-in-mina",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=2200&q=94",
    position: "object-[52%_18%] md:object-[67%_32%]",
    meta: "MINA · OCT 10 · SEOUL",
    script: "Live\nFeels\nDifferent",
  },
];

const AUTOPLAY_MS = 5600;

export function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      AUTOPLAY_MS
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const previous = () =>
    setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);
  const slide = slides[active];

  return (
    <section
      aria-label="Featured MEETSET projects"
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative min-h-[620px] w-full overflow-hidden bg-[#111] md:min-h-[760px]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.x < -55) next();
              if (info.offset.x > 55) previous();
            }}
          >
            <Image
              src={slide.image}
              alt={`${slide.meta} featured project`}
              fill
              priority={active === 0}
              className={`object-cover ${slide.position}`}
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,12,.70)_0%,rgba(8,8,12,.48)_28%,rgba(8,8,12,.10)_58%,rgba(8,8,12,.08)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[620px] max-w-[1480px] flex-col justify-center px-6 pb-20 pt-24 text-white md:min-h-[760px] md:px-10 md:pb-24 md:pt-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${slide.id}`}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[680px]"
            >
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.23em] text-white/80 md:text-[13px]">
                {slide.eyebrow}
              </p>
              <h1 className="max-w-[680px] text-[62px] font-light leading-[.9] tracking-[-0.065em] sm:text-[74px] md:text-[98px] lg:text-[112px]">
                {slide.titleTop}
                <br />
                {slide.titleBottom} <span className="text-[#ffc2d5]">{slide.accent}</span>
              </h1>
              <p className="mt-6 text-base font-medium tracking-[-0.02em] text-white/88 md:text-lg">
                {slide.copy}
              </p>
              <Link
                href={slide.project}
                className="mt-8 inline-flex items-center gap-8 rounded-full bg-[#ff8db4] px-6 py-3.5 text-sm font-bold text-black shadow-[0_12px_30px_rgba(255,141,180,.25)] transition hover:-translate-y-0.5"
              >
                View Project <ArrowRight size={17} />
              </Link>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3">
            {slides.map((item, index) => (
              <button
                key={item.id}
                aria-label={`Show hero slide ${index + 1}: ${item.meta}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                className="group flex h-7 items-center gap-2 px-1"
              >
                <span
                  className={`block h-[2px] transition-all duration-300 ${
                    index === active
                      ? "w-10 bg-[#ff8db4]"
                      : "w-5 bg-white/35 group-hover:bg-white/70"
                  }`}
                />
                <span
                  className={`text-[10px] tabular-nums ${
                    index === active ? "text-white" : "text-white/45"
                  }`}
                >
                  0{index + 1}
                </span>
              </button>
            ))}
          </div>

          <div className="absolute bottom-7 right-6 hidden items-center gap-2 md:flex md:right-10">
            <button
              aria-label="Previous hero slide"
              onClick={previous}
              className="grid size-10 place-items-center rounded-full border border-white/25 bg-black/10 text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              aria-label="Next hero slide"
              onClick={next}
              className="grid size-10 place-items-center rounded-full border border-white/25 bg-black/10 text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              <ArrowRight size={17} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`script-${slide.id}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.45 }}
              className="absolute right-8 top-[44%] hidden -translate-y-1/2 text-right md:block"
            >
              <p className="whitespace-pre-line font-serif text-3xl italic leading-[.95] text-[#ff9fbd]">
                {slide.script}
              </p>
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.17em] text-white/55">
                MEETSET
                <br />FAN EXPERIENCES
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
