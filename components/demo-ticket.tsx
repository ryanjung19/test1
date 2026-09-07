"use client";

import QRCode from "qrcode";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function DemoTicket() {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(JSON.stringify({ project: "serin-black-night", ticketId: "MS-DEMO-260912-001", mode: "preview" }), { margin: 1, width: 280 })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, []);

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-[34px] bg-[#111115] text-white shadow-[0_28px_90px_rgba(0,0,0,.18)]">
      <div className="bg-[#ffb9cf] p-6 text-black">
        <p className="text-[10px] font-black uppercase tracking-[.18em]">MEETSET MOBILE TICKET</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">BLACK NIGHT</h2>
        <p className="mt-1 text-sm font-semibold text-black/55">SERIN · VIP</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 border-b border-white/10 pb-5 text-sm text-white/65"><span className="flex items-center gap-2"><CalendarDays size={15} />SEP 12 · 19:00</span><span className="flex items-center justify-end gap-2"><MapPin size={15} />VASSMENT ONE</span></div>
        <div className="my-6 grid place-items-center rounded-[26px] bg-white p-5">{src ? <img src={src} alt="Demo QR ticket" className="w-full max-w-[240px]" /> : <div className="aspect-square w-full max-w-[240px] animate-pulse rounded-xl bg-black/10" />}</div>
        <div className="flex items-center justify-between text-xs text-white/45"><span>MS-DEMO-260912-001</span><span className="flex items-center gap-1.5 text-[#ffb9cf]"><ShieldCheck size={14} />Preview ticket</span></div>
      </div>
    </div>
  );
}
