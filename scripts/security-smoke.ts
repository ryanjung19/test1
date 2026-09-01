import assert from "node:assert/strict";

import { productionConfigurationIssues } from "../src/lib/config/secrets";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "../src/lib/http/read-json-body";

async function main() {
  const oversized = new Request("https://example.test/inquiry", {
    method: "POST",
    body: JSON.stringify({ message: "x".repeat(25_000) }),
    headers: { "Content-Type": "application/json" },
  });
  await assert.rejects(
    () => readJsonBody(oversized, 20_000),
    RequestBodyTooLargeError,
  );

  const mutableEnv = process.env as Record<string, string | undefined>;
  const changedNames = [
    "NODE_ENV",
    "DATABASE_URL",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_SESSION_SECRET",
    "CUSTOMER_PORTAL_SECRET",
    "INTEGRATION_WEBHOOK_SECRET",
    "AUTOMATION_SECRET",
    "TOSS_CLIENT_KEY",
    "TOSS_SECRET_KEY",
    "TOSS_LIVE_APPROVED",
  ] as const;
  const previous = new Map(changedNames.map((name) => [name, mutableEnv[name]]));
  try {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.DATABASE_URL = "postgresql://vassment:CHANGE_TO_PASSWORD@postgres:5432/vassment";
    mutableEnv.ADMIN_PASSWORD_HASH = "CHANGE_TO_ADMIN_HASH";
    mutableEnv.ADMIN_SESSION_SECRET = "CHANGE_TO_ADMIN_SESSION_SECRET_123456789";
    mutableEnv.CUSTOMER_PORTAL_SECRET = "CHANGE_TO_PORTAL_SECRET_1234567890123";
    mutableEnv.INTEGRATION_WEBHOOK_SECRET = "CHANGE_TO_INTEGRATION_SECRET_123456789";
    mutableEnv.AUTOMATION_SECRET = "CHANGE_TO_AUTOMATION_SECRET_1234567890";
    assert.ok(productionConfigurationIssues().some((issue) => issue.includes("placeholder")));

    mutableEnv.DATABASE_URL = "postgresql://vassment:localtest@postgres:5432/vassment";
    mutableEnv.ADMIN_PASSWORD_HASH = `scrypt$32768$8$1$${"a".repeat(32)}$${"b".repeat(85)}`;
    mutableEnv.ADMIN_SESSION_SECRET = "a".repeat(64);
    mutableEnv.CUSTOMER_PORTAL_SECRET = "b".repeat(64);
    mutableEnv.INTEGRATION_WEBHOOK_SECRET = "c".repeat(64);
    mutableEnv.AUTOMATION_SECRET = "d".repeat(64);
    assert.ok(
      productionConfigurationIssues().includes("ADMIN_PASSWORD_HASH:invalid_format"),
    );

    mutableEnv.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/vassment_one_booking";
    assert.ok(
      productionConfigurationIssues().includes("DATABASE_URL:unsafe_default"),
    );

    mutableEnv.TOSS_CLIENT_KEY = "live_ck_example";
    mutableEnv.TOSS_SECRET_KEY = "live_sk_example";
    mutableEnv.TOSS_LIVE_APPROVED = "false";
    assert.ok(productionConfigurationIssues().includes("TOSS_KEYS:live_not_approved"));
  } finally {
    for (const name of changedNames) {
      const value = previous.get(name);
      if (value === undefined) delete mutableEnv[name];
      else mutableEnv[name] = value;
    }
  }
}

main().then(() => {
  console.log("Security smoke checks passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
