#!/usr/bin/env bun
/**
 * Prisma provider switcher.
 *
 * Reads DATABASE_URL from the environment and sets the `provider` field in
 * prisma/schema.prisma to "sqlite" or "postgresql" accordingly. This lets
 * the same schema.prisma file work for both local dev (SQLite) and Vercel
 * production (PostgreSQL) without manual edits.
 *
 * Usage:  bun run scripts/prisma-provider.ts
 * Then:   bunx prisma db push  (or any prisma command)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const schemaPath = join(import.meta.dir, "..", "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf-8");

const dbUrl = process.env.DATABASE_URL ?? "";
const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
const provider = isPostgres ? "postgresql" : "sqlite";

const updated = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`,
);

if (schema === updated) {
  console.log(`[prisma-provider] provider already set to "${provider}"`);
} else {
  writeFileSync(schemaPath, updated, "utf-8");
  console.log(`[prisma-provider] switched provider to "${provider}" (DATABASE_URL=${dbUrl.slice(0, 40)}...)`);
}
