import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/server/**"],
      reporter: ["text", "html", "lcov"],
      // No enforced thresholds yet — starting point is ~1.3% file-level
      // coverage repo-wide. Ratchet this up as test batches land instead
      // of picking an aspirational number now.
      //
      // `pnpm test:coverage` runs only the "db"/"codemods" projects: v8
      // coverage relies on node:inspector, which doesn't exist in the
      // workerd runtime the "app" project runs under, so instrumenting it
      // crashes with ERR_METHOD_NOT_IMPLEMENTED. Business logic (the thing
      // this threshold tracks) lives in the "db" project anyway.
    },
    projects: [
      {
        plugins: [
          cloudflareTest(() => ({
            wrangler: {
              configPath: "./wrangler.jsonc",
            },
          })),
        ],
        test: {
          name: "app",
          exclude: ["**/node_modules/**", "scripts/**", "test/db/**"],
        },
      },
      {
        test: {
          name: "db",
          environment: "node",
          include: ["test/db/**/*.test.ts"],
          globalSetup: ["./test/setup.ts"],
          // Test files share one Postgres container and truncate all tables
          // between tests (see test/helpers/reset-db.ts) — running files in
          // parallel lets one file's truncate wipe another's in-flight rows.
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "codemods",
          environment: "node",
          include: ["scripts/codemods/**/*.test.ts"],
        },
      },
    ],
  },
});

export default config;
