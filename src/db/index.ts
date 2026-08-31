import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { readSecret } from "@/lib/config/secrets";

import * as schema from "./schema";

const connectionString = readSecret("DATABASE_URL");
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    ...(connectionString ? { connectionString } : {}),
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

export function isDatabaseConfigured() {
  return Boolean(connectionString);
}
