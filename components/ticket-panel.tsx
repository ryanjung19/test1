"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Experience, TicketTier } from "@/lib/projects";

function won(value: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

export function TicketPanel({ tickets, experiences }: { tickets: TicketTier[]; experiences: Experience[] }) {
  const [ticket, setTicket] = useState(tickets[0]?.id ?? "");
  const [addons, setAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const activeTicket = tickets.find((item) => item.id === ticket);
  const total = useMemo(() => {
    const base = (activeTicket?.price ?? 0) * quantity;
    const extra = experiences.filter((item) => addons.includes(item.id)).reduce((sum, item) => sum + item.price, 0);
    return base + extra;
  }, [activeTicket, addons, experiences, quantity]);

  if (!tickets.length) {
    return <div className="rounded-[30px] border border-black/10 bg-white/75 p-7"><p className="text-sm font-bold uppercase tracking-[.15em] text-black/35">Coming soon</p><h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Ticket sales are not open yet.</h3></div>;
  }

  return (
    <div className="sticky top-28 rounded-[32px] border border-black/10 bg-white/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,.08)] backdrop-blur-xl md:p-6">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.18em] text-black/35">Choose ticket</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Your experience</h3></div><ShoppingBag size={21} /></div>

      <div className="space-y-2">
        {tickets.map((item) => {
          const selected = item.id === ticket;
          return (
            <button key={item.id} onClick={() => setTicket(item.id)} className={`w-full rounded-[22px] border p-4 text-left transition ${selected ? "border-black bg-black text-white" : "border-black/10 bg-white hover:border-black/25"}`}>
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-black tracking-[.04em]">{item.name}</span>{selected && <span className="grid size-5 place-items-center rounded-full bg-[#ffb9cf] text-black"><Check size={12} /></span>}</div><p className={`mt-1 text-xs leading-5 ${selected ? "text-white/55" : "text-black/45"}`}>{item.description}</p></div><div className="text-right"><p className="font-bold">{won(item.price)}</p>{typeof item.remaining === "number" && <p className={`mt-1 text-[10px] font-bold uppercase tracking-[.1em] ${selected ? "text-[#ffb9cf]" : "text-[#e76593]"}`}>{item.remaining} left</p>}</div></div>
            </button>
          );
        })}
      </div>

      <div className="my-6 flex items-center justify-between border-y border-black/10 py-4"><span className="text-sm font-semibold">Quantity</span><div className="flex items-center gap-3"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid size-9 place-items-center rounded-full border border-black/10"><Minus size={14} /></button><span className="w-5 text-center font-bold">{quantity}</span><button onClick={() => setQuantity((value) => Math.min(4, value + 1))} className="grid size-9 place-items-center rounded-full border border-black/10"><Plus size={14} /></button></div></div>

      {experiences.length > 0 && <div><p className="mb-3 text-[11px] font-black uppercase tracking-[.18em] text-black/35">Experience add-ons</p><div className="space-y-2">{experiences.map((item) => {
        const selected = addons.includes(item.id);
        return <button key={item.id} onClick={() => setAddons((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-[#ff8db4] bg-[#fff1f6]" : "border-black/10"}`}><div><p className="text-sm font-bold">{item.name}</p><p className="mt-0.5 text-[11px] text-black/40">{item.description}</p></div><span className="ml-4 text-sm font-semibold">+ {won(item.price)}</span></button>;
      })}</div></div>}

      <div className="mt-6 border-t border-black/10 pt-5"><div className="mb-4 flex items-end justify-between"><span className="text-sm text-black/45">Total</span><AnimatePresence mode="popLayout"><motion.span key={total} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} className="text-2xl font-black tracking-[-0.04em]">{won(total)}</motion.span></AnimatePresence></div><button className="w-full rounded-full bg-[#ffb9cf] px-5 py-4 text-sm font-black transition hover:bg-[#ff9fc1]">CONTINUE TO CHECKOUT</button><p className="mt-3 text-center text-[10px] leading-4 text-black/35">Demo checkout in V2 preview. Production payment will be connected to J&Company PG.</p></div>
    </div>
  );
}
