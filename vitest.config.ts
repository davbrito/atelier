import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/server/application/**"],
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
      //
      // src/server/functions/** is excluded on purpose: those are thin
      // createServerFn wrappers that only run inside a request/workerd
      // context, so there's no way to exercise them under this coverage
      // run — including them would just pad the report with permanent 0%s.
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
          // Each test file clones its own database from the migrated
          // template (see test/helpers/fixtures.ts), so files no longer
          // share state and can run in parallel. (An earlier fix here
          // disabled fileParallelism suspecting CREATE/DROP DATABASE
          // catalog-lock contention — the real cause turned out to be a
          // connection leak in the db fixture unrelated to parallelism, now
          // fixed, so parallelism is back on.)
          // Explicit, generous but bounded: fail loudly with a stack trace
          // instead of running indefinitely if something unexpected blocks
          // again. (teardownTimeout isn't a valid per-project option here —
          // fixture onCleanup timeouts are handled by fixtures.ts's own
          // timed() helper instead, which is what actually caught the real
          // hang; vitest's hookTimeout/teardownTimeout didn't.)
          testTimeout: 15_000,
          hookTimeout: 15_000,
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
