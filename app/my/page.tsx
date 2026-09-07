import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DemoTicket } from "@/components/demo-ticket";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function MyTicketsPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-20 pt-28 md:px-8 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-black/45"><ArrowLeft size={16} />Back home</Link>
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div className="pt-4">
              <p className="text-xs font-black uppercase tracking-[.2em] text-black/35">My wallet</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.065em] md:text-7xl">Your moments,<br />ready at the door.</h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-black/55">This V2 screen previews the mobile QR ticket flow. Production will connect purchase verification, refund state and check-in status to the backend.</p>
            </div>
            <DemoTicket />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
