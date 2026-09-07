import { ArrowUpRight, Camera, Sparkles, TicketCheck } from "lucide-react";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProjectGrid } from "@/components/project-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ProjectGrid />

        <section id="creators" className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[34px] bg-[#111115] p-7 text-white lg:col-span-2 md:p-10">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-white/40">For creators & agencies</p>
                <h2 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">A project, not just a venue.</h2>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/55">J&Company plans, sells and operates the full fan project: ticketing, premium experiences, venue, on-site operations and post-event portfolio.</p>
                <Link href="/work" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#ffb9cf] px-5 py-3 font-bold text-black">Start a project <ArrowUpRight size={17} /></Link>
              </div>
              <div className="mesh rounded-[34px] bg-[#eee8ff] p-7 md:p-9">
                <Sparkles size={28} />
                <p className="mt-16 text-xs font-bold uppercase tracking-[.18em] text-black/40">Our home base</p>
                <h3 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">VASSMENT ONE</h3>
                <p className="mt-4 text-sm leading-6 text-black/55">Our primary Seoul venue. Selected projects may also take place at external venues.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                [TicketCheck, "Ticketing", "Tiered tickets and mobile QR admission."],
                [Camera, "Experiences", "Cheki, photo sessions, 1:1 talk and limited add-ons."],
                [Sparkles, "Curated", "A smaller number of projects with stronger production quality."]
              ].map(([Icon, title, copy]) => {
                const I = Icon as typeof TicketCheck;
                return <div key={String(title)} className="rounded-[30px] border border-black/10 bg-white/70 p-7 backdrop-blur"><I size={22} /><h3 className="mt-10 text-2xl font-semibold tracking-[-0.04em]">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-black/50">{String(copy)}</p></div>;
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
