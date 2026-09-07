import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="px-4 pb-6 pt-16 md:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#111115] p-7 text-white md:p-10">
        <div className="grid gap-12 md:grid-cols-[1.3fr_.7fr_.7fr]">
          <div>
            <div className="text-4xl font-black tracking-[-0.08em]">MEET<span className="text-[#ffb9cf]">SET</span></div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">Fan Meets Real Moments. Premium fan experiences operated by J&Company.</p>
          </div>
          <div className="text-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-white/35">Explore</p>
            <div className="flex flex-col gap-3 text-white/75"><Link href="/#projects">Projects</Link><Link href="/work">Work with us</Link><Link href="/my">My tickets</Link></div>
          </div>
          <div className="text-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-white/35">Operator</p>
            <div className="space-y-2 text-white/55"><p>J&Company</p><p>Business details to be inserted before launch.</p><p>contact@meetset.kr</p></div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-5 text-[11px] text-white/35 md:flex-row md:justify-between"><span>© 2026 MEETSET · Operated by J&Company</span><span>Terms · Privacy · Refund policy</span></div>
      </div>
    </footer>
  );
}
