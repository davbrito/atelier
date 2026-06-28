import assert from "node:assert";
import { defineConfig } from "drizzle-kit";

assert(process.env.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED is required");

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});
