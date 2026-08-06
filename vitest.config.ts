import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const config = defineConfig({
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
    globalSetup: ["./test/setup.ts"],
  },
});

export default config;
