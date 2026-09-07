import { ArrowLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const bullets = ["Fan meeting / photo event / live / showcase", "Ticketing + premium experience design", "Primary Seoul venue: VASSMENT ONE", "External venue support", "On-site operations and settlement support"];

export default function WorkPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-20 pt-28 md:px-8 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-black/45"><ArrowLeft size={16} />Back home</Link>
          <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
            <section className="rounded-[36px] bg-[#111115] p-7 text-white md:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[.2em] text-white/35">For creators · agencies · brands</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.065em] md:text-7xl">Build a fan project with MEETSET.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/55">J&Company plans and operates the project end-to-end. You bring the creator and the concept; MEETSET handles the commercial and event layer.</p>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">{bullets.map((item) => <div key={item} className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#ffb9cf]" />{item}</div>)}</div>
            </section>

            <section className="rounded-[36px] border border-black/10 bg-white/78 p-7 backdrop-blur md:p-9">
              <p className="text-xs font-black uppercase tracking-[.2em] text-black/35">Project inquiry</p>
              <form className="mt-7 space-y-4">
                {["Name / company", "Creator name", "Instagram / TikTok / YouTube", "Expected audience", "Preferred date", "Contact email or phone"].map((label) => <label key={label} className="block"><span className="mb-2 block text-xs font-bold text-black/50">{label}</span><input className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 outline-none transition focus:border-black/35" placeholder={label} /></label>)}
                <label className="block"><span className="mb-2 block text-xs font-bold text-black/50">Message</span><textarea className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3.5 outline-none transition focus:border-black/35" placeholder="Tell us what you want to create." /></label>
                <button type="button" className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ffb9cf] px-5 py-4 text-sm font-black">SEND PROJECT REQUEST <ArrowUpRight size={17} /></button>
                <p className="text-center text-[10px] leading-4 text-black/35">Preview form only. Production CRM endpoint will be connected before launch.</p>
              </form>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
