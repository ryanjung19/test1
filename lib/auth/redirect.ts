export function safeNextPath(candidate: string | null) {
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/app";
  const base = "https://stockpulse.invalid";
  try {
    const url = new URL(candidate, base);
    return url.origin === base ? url.pathname + url.search + url.hash : "/app";
  } catch { return "/app"; }
}
