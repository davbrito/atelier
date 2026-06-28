import assert from "node:assert";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { createDb } from "#/db/client";
import * as schema from "#/db/schema";
import { baseConfig } from "./base-config.server";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
assert(url, "DATABASE_URL_UNPOOLED or DATABASE_URL env var is required");

const db = createDb(url);

export const auth = betterAuth({
  ...baseConfig,
  database: drizzleAdapter(db, { provider: "pg", transaction: true, schema }),
});
