"use client";

import { Camera, CameraOff, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";

// QR scanner flow adapted from OpenLuma's MIT-licensed check-in page.
// See THIRD_PARTY_NOTICES.md for attribution.
export default function CheckInPreviewPage() {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");
  const scanner = useRef<{ stop: () => Promise<void> } | null>(null);

  async function start() {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const instance = new Html5Qrcode("meetset-qr-reader");
    scanner.current = instance;

    try {
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          try {
            const payload = JSON.parse(decodedText);
            const label = payload.ticketId || payload.project || "MEETSET ticket";
            setLastResult(`VALID · ${label}`);
            instance.pause(true);
            setTimeout(() => {
              try { instance.resume(); } catch { /* scanner stopped */ }
            }, 1800);
          } catch {
            setLastResult("INVALID QR FORMAT");
          }
        },
        () => undefined
      );
    } catch {
      setScanning(false);
      setLastResult("CAMERA ACCESS REQUIRED");
    }
  }

  async function stop() {
    if (scanner.current) {
      try { await scanner.current.stop(); } catch { /* already stopped */ }
    }
    scanner.current = null;
    setScanning(false);
  }

  useEffect(() => () => {
    if (scanner.current) scanner.current.stop().catch(() => undefined);
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="px-4 pb-24 pt-28 md:px-8 md:pt-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8"><p className="text-xs font-black uppercase tracking-[.2em] text-black/35">Operator preview</p><h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em] md:text-7xl">Fast door check-in.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-black/50">This camera scanner implements the OpenLuma-style QR check-in primitive. Production will validate ticket state against the MEETSET backend before recording entry.</p></div>

          <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
            <section className="overflow-hidden rounded-[32px] bg-[#111115] p-5 text-white md:p-7">
              <div className="mb-5 flex items-center justify-between"><span className="text-sm font-bold">QR SCANNER</span><button onClick={scanning ? stop : start} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${scanning ? "bg-white/12 text-white" : "bg-[#ffb9cf] text-black"}`}>{scanning ? <CameraOff size={15} /> : <Camera size={15} />}{scanning ? "STOP" : "START CAMERA"}</button></div>
              <div id="meetset-qr-reader" className="min-h-[320px] overflow-hidden rounded-[24px] bg-white/5" />
            </section>

            <section className="rounded-[32px] border border-black/10 bg-white/75 p-6 backdrop-blur">
              <ShieldCheck size={26} />
              <p className="mt-12 text-xs font-black uppercase tracking-[.18em] text-black/35">Last scan</p>
              <div className="mt-3 min-h-28 rounded-[22px] bg-[#f5f3f3] p-5"><div className="flex items-center gap-2"><CheckCircle2 size={18} className={lastResult.startsWith("VALID") ? "text-green-600" : "text-black/25"} /><span className="font-bold">{lastResult || "Waiting for ticket"}</span></div></div>
              <p className="mt-5 text-xs leading-5 text-black/40">Preview only: duplicate admission, refund status, event matching and attendee records will be server-validated in production.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
