"use client";

import { ArrowUpRight, MapPin } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { projects } from "@/lib/projects";

export function ProjectGrid() {
  return (
    <section id="projects" className="px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-black/40">Current & upcoming</p>
            <h2 className="text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Projects</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-black/55">Each project is a limited real-world experience: a fan meeting, photo event, live set or showcase. VASSMENT ONE is our primary Seoul venue, while selected projects may move to other spaces.</p>
        </div>

        <div className="grid gap-x-5 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.article key={project.slug} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .55, delay: index * .06 }}>
              <Link href={`/projects/${project.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[30px] bg-[#f0eef1]">
                  <Image src={project.image} alt={`${project.creator} ${project.title}`} fill className="object-cover transition duration-700 ease-out group-hover:scale-[1.045]" sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className={`rounded-full px-3 py-2 text-[10px] font-black tracking-[.13em] ${project.status === "ON SALE" ? "bg-[#ffb9cf] text-black" : project.status === "SOLD OUT" ? "bg-black text-white" : "bg-white/88 text-black backdrop-blur"}`}>{project.status}</span>
                  </div>
                  <div className="absolute bottom-4 right-4 grid size-12 place-items-center rounded-full bg-white text-black shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110"><ArrowUpRight size={18} /></div>
                </div>

                <div className="px-1 pt-5">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-black/40">{project.creator} · {project.category}</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.055em]">{project.title}</h3>
                  <div className="mt-4 flex items-center justify-between gap-4 text-sm text-black/55">
                    <span>{project.date}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} />{project.city}</span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
