import { ArrowRight, Building2, Camera, Handshake, Heart, Music2, Ticket, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { ProjectGrid } from "@/components/project-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const categories = [
  [Ticket, "Fan Meetings", "더 가까이, 더 특별하게"],
  [Camera, "Photo Events", "잊지 못할 한 장의 순간"],
  [Music2, "Live & Showcase", "무대 위, 새로운 매력"],
  [Heart, "Special Projects", "지금, 여기서만 가능한 경험"]
] as const;

const partners = [
  [UserRound, "크리에이터", "팬과 만나는 새로운 기회"],
  [Building2, "기획사 / 매니지먼트", "기획부터 운영까지"],
  [Handshake, "브랜드 / 협업", "특별한 프로젝트 제안"]
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ProjectGrid />

        <section className="border-y border-[#f2c7d4] bg-[linear-gradient(90deg,#fff7fa_0%,#ffeaf1_50%,#fff7fa_100%)] px-4 py-8 md:px-8 md:py-10">
          <div className="mx-auto grid max-w-[1480px] grid-cols-2 md:grid-cols-4">
            {categories.map(([Icon, title, copy], index) => (
              <div key={title} className={`flex min-h-[120px] flex-col items-center justify-center px-4 text-center ${index > 0 ? "border-l border-[#e7c8d1]" : ""} ${index === 2 ? "max-md:border-l-0 max-md:border-t max-md:border-[#e7c8d1]" : ""} ${index === 3 ? "max-md:border-t max-md:border-[#e7c8d1]" : ""}`}>
                <Icon size={28} strokeWidth={1.65} className="text-[#e46691]" />
                <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.035em] md:text-[20px]">{title}</h3>
                <p className="mt-1 text-[11px] text-black/45 md:text-xs">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="grid min-h-[430px] grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-[430px] overflow-hidden bg-black text-white">
            <Image src="https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=1600&q=90" alt="Fans sharing a live moment" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
            <div className="absolute inset-0 bg-black/48" />
            <div className="relative z-10 flex h-full min-h-[430px] flex-col justify-center px-8 py-12 md:px-12 lg:px-[9vw]">
              <h2 className="max-w-xl text-[38px] font-light leading-[1.06] tracking-[-0.05em] md:text-[48px]">More than an Event<br /><span className="text-[#ff9fbd]">A Story We Create Together</span></h2>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/72 md:text-base">MEETSET은 크리에이터와 팬이 직접 만나 진짜 순간을 만드는 팬 경험 프로젝트 플랫폼입니다.</p>
              <Link href="#projects" className="mt-7 inline-flex w-fit items-center gap-4 rounded-full bg-[#ff8db4] px-6 py-3 text-sm font-bold text-black">About MEETSET <ArrowRight size={16} /></Link>
            </div>
          </div>

          <div id="creators" className="flex min-h-[430px] flex-col justify-center bg-white px-8 py-12 md:px-12 lg:px-[6vw]">
            <h2 className="text-[34px] font-semibold tracking-[-0.055em] md:text-[42px]">Work with MEETSET</h2>
            <p className="mt-2 text-sm text-black/45">당신의 특별한 프로젝트를 함께 만들어보세요.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {partners.map(([Icon, title, copy]) => (
                <div key={title} className="rounded-2xl border border-black/[0.07] bg-[#fbfafb] p-5 text-center">
                  <Icon className="mx-auto" size={25} strokeWidth={1.6} />
                  <h3 className="mt-4 text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-[11px] leading-5 text-black/42">{copy}</p>
                </div>
              ))}
            </div>
            <Link href="/work" className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-[#17171b] px-6 py-3.5 text-sm font-bold text-white">프로젝트 제안하기 <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
