"use client";

import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { projects } from "@/lib/projects";

export function ProjectGrid() {
  return (
    <section id="projects" className="bg-white px-4 py-14 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-[34px] font-semibold tracking-[-0.055em] md:text-[44px]">Upcoming Projects</h2>
            <p className="mt-2 text-sm text-black/48 md:text-base">좋아하는 크리에이터와, 특별한 순간을 만나는 공간</p>
          </div>
          <Link href="#projects" className="hidden items-center gap-2 text-xs font-semibold md:flex">View All <ArrowRight size={15} /></Link>
        </div>

        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {projects.map((project, index) => (
            <motion.article
              key={project.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: .25 }}
              transition={{ duration: .45, delay: index * .05 }}
              className="w-[78vw] shrink-0 snap-start sm:w-[45vw] lg:w-[24%]"
            >
              <Link href={`/projects/${project.slug}`} className="group block overflow-hidden rounded-[18px] border border-black/[0.06] bg-[#f8f7f8] transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,.09)]">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={project.image}
                    alt={`${project.creator} ${project.title}`}
                    fill
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 78vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/5 to-transparent" />
                  <span className={`absolute left-4 top-4 rounded-full px-3 py-2 text-[10px] font-black tracking-[.08em] ${project.status === "ON SALE" ? "bg-[#ff8db4] text-black" : project.status === "SOLD OUT" ? "bg-white text-black" : "bg-white/88 text-black backdrop-blur"}`}>
                    {project.status}
                  </span>
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-white/70">{project.creator}</p>
                    <h3 className="mt-1 text-[24px] font-bold tracking-[-0.045em]">{project.title}</h3>
                    <div className="mt-4 space-y-1.5 text-[11px] text-white/82">
                      <p className="flex items-center gap-2"><CalendarDays size={13} /> {project.date}</p>
                      <p className="flex items-center gap-2"><MapPin size={13} /> {project.venue} · {project.city}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-[#ffafc8] px-2 py-1 text-[9px] font-bold text-[#d85f87]">#{project.category}</span>
                    <span className="rounded-md border border-black/10 px-2 py-1 text-[9px] font-bold text-black/50">#MEETSET</span>
                  </div>
                  <span className="grid size-9 place-items-center rounded-full border border-[#ffafc8] text-[#e46990] transition group-hover:bg-[#ff8db4] group-hover:text-black"><ArrowRight size={15} /></span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
