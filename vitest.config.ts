import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest(({ inject }) => {
            const echoServerPort = inject("echoServerPort");

            return {
              miniflare: {
                hyperdrives: {
                  HYPERDRIVE: `postgres://user:pass@127.0.0.1:${echoServerPort}/db`,
                },
              },
              wrangler: {
                configPath: "./wrangler.jsonc",
              },
            };
          }),
        ],
        test: {
          name: "app",
          exclude: ["**/node_modules/**", "scripts/**"],
          globalSetup: ["./test/setup.ts"],
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
