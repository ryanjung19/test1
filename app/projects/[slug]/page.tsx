import { ArrowLeft, CalendarDays, MapPin, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketPanel } from "@/components/ticket-panel";
import { getProject, projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-20 pt-28 md:px-8 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <Link href="/#projects" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-black/45 transition hover:text-black"><ArrowLeft size={16} />Back to projects</Link>

          <section className="relative overflow-hidden rounded-[36px] bg-black text-white">
            <div className="relative min-h-[68vh] md:min-h-[76vh]">
              <Image src={project.hero} alt={project.title} fill priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 lg:p-12">
                <div className="mb-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#ffb9cf] px-3 py-2 text-[10px] font-black tracking-[.14em] text-black">{project.status}</span><span className="rounded-full bg-white/16 px-3 py-2 text-[10px] font-black tracking-[.14em] backdrop-blur">{project.category}</span></div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-white/55">{project.creator} · {project.eyebrow}</p>
                <h1 className="mt-3 max-w-4xl text-5xl font-semibold tracking-[-0.065em] md:text-7xl lg:text-8xl">{project.title}</h1>
                <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/65"><span className="flex items-center gap-2"><CalendarDays size={16} />{project.date}</span><span className="flex items-center gap-2"><MapPin size={16} />{project.venue} · {project.city}</span><span className="flex items-center gap-2"><UsersRound size={16} />Limited capacity</span></div>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
            <div>
              <section className="border-b border-black/10 py-8 md:py-12"><p className="text-xs font-black uppercase tracking-[.2em] text-black/35">About the project</p><p className="mt-5 max-w-3xl text-2xl font-medium leading-[1.45] tracking-[-0.035em] md:text-3xl">{project.description}</p></section>

              <section className="border-b border-black/10 py-8 md:py-12"><p className="text-xs font-black uppercase tracking-[.2em] text-black/35">Program</p><div className="mt-6 divide-y divide-black/10">{project.program.map((item, index) => <div key={item.time + item.title} className="grid grid-cols-[72px_1fr_auto] items-center py-4 md:grid-cols-[100px_1fr_auto]"><span className="font-mono text-sm text-black/45">{item.time}</span><span className="text-lg font-semibold tracking-[-0.02em]">{item.title}</span><span className="text-xs font-bold text-black/25">0{index + 1}</span></div>)}</div></section>

              <section className="py-8 md:py-12"><div className="rounded-[30px] bg-[#eee8ff] p-7 md:p-9"><p className="text-xs font-black uppercase tracking-[.2em] text-black/35">Venue note</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{project.venue}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">Venue details, transportation and check-in instructions are shown on the final ticket. MEETSET is venue-neutral; VASSMENT ONE is the primary Seoul venue and external venues are supported when the project requires it.</p></div></section>
            </div>
            <aside><TicketPanel tickets={project.tickets} experiences={project.experiences} /></aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
