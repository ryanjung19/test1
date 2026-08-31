import { readFileSync } from "node:fs";

const PLACEHOLDER_MARKERS = [
  "change_to_",
  "replace-with-",
  "replace_me",
  "replace-me",
  "ci-only-",
] as const;

export function readSecret(name: string) {
  const file = process.env[`${name}_FILE`]?.trim();
  if (file) {
    return readFileSync(file, "utf8").trim();
  }

  return process.env[name]?.trim();
}

function isPlaceholder(value: string) {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function isScryptHash(value: string) {
  return /^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]{32}\$[A-Za-z0-9_-]{86}$/.test(value);
}

function databaseUrlUsesUnsafeDefault(value: string) {
  try {
    const url = new URL(value);
    return url.protocol.startsWith("postgres") &&
      url.username.toLowerCase() === "postgres" &&
      url.password.toLowerCase() === "postgres";
  } catch {
    return false;
  }
}

export function productionConfigurationIssues() {
  if (process.env.NODE_ENV !== "production") return [];

  const requirements = [
    ["ADMIN_PASSWORD_HASH", 1],
    ["ADMIN_SESSION_SECRET", 32],
    ["CUSTOMER_PORTAL_SECRET", 32],
    ["INTEGRATION_WEBHOOK_SECRET", 32],
    ["AUTOMATION_SECRET", 32],
  ] as const;
  const issues: string[] = [];
  const values = new Map<string, string>();

  for (const [name, minimumLength] of requirements) {
    try {
      const value = readSecret(name);
      if (!value) {
        issues.push(`${name}:missing`);
        continue;
      }
      values.set(name, value);
      if (value.length < minimumLength) issues.push(`${name}:too_short`);
      if (isPlaceholder(value)) issues.push(`${name}:placeholder`);
    } catch {
      issues.push(`${name}:unreadable`);
    }
  }

  const adminHash = values.get("ADMIN_PASSWORD_HASH");
  if (adminHash && !isScryptHash(adminHash)) {
    issues.push("ADMIN_PASSWORD_HASH:invalid_format");
  }

  const signingNames = [
    "ADMIN_SESSION_SECRET",
    "CUSTOMER_PORTAL_SECRET",
    "INTEGRATION_WEBHOOK_SECRET",
    "AUTOMATION_SECRET",
  ] as const;
  const signingValues = signingNames
    .map((name) => values.get(name))
    .filter((value): value is string => Boolean(value));
  if (new Set(signingValues).size !== signingValues.length) {
    issues.push("SIGNING_SECRETS:not_distinct");
  }

  try {
    const databaseUrl = readSecret("DATABASE_URL");
    if (!databaseUrl) issues.push("DATABASE_URL:missing");
    else if (isPlaceholder(databaseUrl)) issues.push("DATABASE_URL:placeholder");
    else if (databaseUrlUsesUnsafeDefault(databaseUrl)) {
      issues.push("DATABASE_URL:unsafe_default");
    }
  } catch {
    issues.push("DATABASE_URL:unreadable");
  }

  try {
    const tossClientKey = readSecret("TOSS_CLIENT_KEY") ?? "";
    const tossSecretKey = readSecret("TOSS_SECRET_KEY") ?? "";
    if (Boolean(tossClientKey) !== Boolean(tossSecretKey)) {
      issues.push("TOSS_KEYS:incomplete_pair");
    }
    const hasLiveKey = tossClientKey.startsWith("live_") || tossSecretKey.startsWith("live_");
    if (hasLiveKey && process.env.TOSS_LIVE_APPROVED !== "true") {
      issues.push("TOSS_KEYS:live_not_approved");
    }
  } catch {
    issues.push("TOSS_KEYS:unreadable");
  }

  return [...new Set(issues)];
}

export function tossKeys() {
  const clientKey = readSecret("TOSS_CLIENT_KEY");
  const secretKey = readSecret("TOSS_SECRET_KEY");
  if (!clientKey || !secretKey) return null;
  const hasLiveKey = clientKey.startsWith("live_") || secretKey.startsWith("live_");
  if (hasLiveKey && process.env.TOSS_LIVE_APPROVED !== "true") return null;
  return { clientKey, secretKey };
}
