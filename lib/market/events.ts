import type { MarketSnapshot } from "./types";

export type MarketEvent = {
  id: string;
  eventType: "rapid_move" | "volume_spike" | "news_disclosure";
  snapshot: MarketSnapshot;
  detectedAt: string;
  source: string;
  isDemo: boolean;
};
export type ExpertCommentary = {
  id: string;
  expertId: string;
  marketEventId: string | null;
  body: string;
  publishedAt: string | null;
};
