export type ProjectStatus = "ON SALE" | "COMING SOON" | "SOLD OUT" | "COMPLETED";

export type TicketTier = {
  id: string;
  name: string;
  price: number;
  description: string;
  remaining?: number;
};

export type Experience = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export type Project = {
  slug: string;
  creator: string;
  title: string;
  eyebrow: string;
  date: string;
  venue: string;
  city: string;
  category: string;
  status: ProjectStatus;
  image: string;
  hero: string;
  description: string;
  program: { time: string; title: string }[];
  tickets: TicketTier[];
  experiences: Experience[];
};

export const projects: Project[] = [
  {
    slug: "serin-black-night",
    creator: "SERIN",
    title: "BLACK NIGHT",
    eyebrow: "SPECIAL FAN MEETING",
    date: "SEP 12 · 7:00 PM",
    venue: "VASSMENT ONE",
    city: "SEOUL",
    category: "FAN MEETING",
    status: "ON SALE",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=90",
    hero: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1800&q=92",
    description: "Talk, photo sessions and a limited meet & greet in one intimate fan project.",
    program: [
      { time: "19:00", title: "CHECK-IN" },
      { time: "19:30", title: "TALK & Q&A" },
      { time: "20:10", title: "PHOTO SESSION" },
      { time: "21:00", title: "MEET & GREET" }
    ],
    tickets: [
      { id: "general", name: "GENERAL", price: 99000, description: "Entry · Talk · Group photo", remaining: 24 },
      { id: "vip", name: "VIP", price: 249000, description: "GENERAL + 1:1 photo + Signed photo", remaining: 4 },
      { id: "vvip", name: "VVIP", price: 399000, description: "VIP + Premium session + After talk", remaining: 2 }
    ],
    experiences: [
      { id: "cheki", name: "CHEKI", price: 30000, description: "1 instant photo with creator" },
      { id: "premium-cheki", name: "PREMIUM CHEKI", price: 50000, description: "Premium pose + signed instant photo" },
      { id: "photo-5min", name: "5 MIN PHOTO SESSION", price: 50000, description: "Private timed photo session" },
      { id: "talk", name: "1:1 TALK", price: 50000, description: "Short private conversation session" },
      { id: "voice", name: "VOICE MESSAGE", price: 40000, description: "Personal recorded message" }
    ]
  },
  {
    slug: "hayun-private-photo-day",
    creator: "HAYUN",
    title: "PRIVATE PHOTO DAY",
    eyebrow: "PHOTO EVENT",
    date: "SEP 26 · 2:00 PM",
    venue: "VASSMENT ONE",
    city: "SEOUL",
    category: "PHOTO EVENT",
    status: "ON SALE",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=90",
    hero: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1800&q=92",
    description: "A small-format photo event designed around limited sessions and closer fan interaction.",
    program: [
      { time: "14:00", title: "CHECK-IN" },
      { time: "14:20", title: "PHOTO SESSION A" },
      { time: "15:20", title: "TALK" },
      { time: "16:00", title: "PHOTO SESSION B" }
    ],
    tickets: [
      { id: "general", name: "GENERAL", price: 79000, description: "Entry · Main photo session", remaining: 16 },
      { id: "vip", name: "VIP", price: 179000, description: "GENERAL + priority session", remaining: 5 }
    ],
    experiences: [
      { id: "cheki", name: "CHEKI", price: 30000, description: "1 instant photo" },
      { id: "talk", name: "1:1 TALK", price: 40000, description: "Short fan talk session" }
    ]
  },
  {
    slug: "mina-fall-in-mina",
    creator: "MINA",
    title: "FALL IN MINA",
    eyebrow: "LIVE PROJECT",
    date: "OCT 10 · 6:00 PM",
    venue: "VENUE TBA",
    city: "SEOUL",
    category: "LIVE",
    status: "COMING SOON",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=90",
    hero: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1800&q=92",
    description: "A live fan project combining talk, performance and a limited premium session.",
    program: [
      { time: "18:00", title: "OPEN" },
      { time: "18:30", title: "TALK" },
      { time: "19:00", title: "LIVE" }
    ],
    tickets: [],
    experiences: []
  },
  {
    slug: "yuna-sweet-moment",
    creator: "YUNA",
    title: "SWEET MOMENT",
    eyebrow: "SPECIAL PROJECT",
    date: "AUG 15 · 4:00 PM",
    venue: "VASSMENT ONE",
    city: "SEOUL",
    category: "SPECIAL",
    status: "SOLD OUT",
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90",
    hero: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=92",
    description: "A completed intimate fan project preserved as part of the MEETSET portfolio.",
    program: [
      { time: "16:00", title: "OPEN" },
      { time: "16:30", title: "TALK" },
      { time: "17:10", title: "PHOTO SESSION" },
      { time: "18:00", title: "CLOSING" }
    ],
    tickets: [],
    experiences: []
  }
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
