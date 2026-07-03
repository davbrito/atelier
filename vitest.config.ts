import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  plugins: [cloudflareTest({})],
});

export default config;
