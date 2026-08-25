import { i18n, locales } from "@better-auth/i18n";
import { passkey } from "@better-auth/passkey";
import type { BetterAuthOptions } from "better-auth";
import { admin, lastLoginMethod, oneTap, organization } from "better-auth/plugins";
import { ac, roles } from "./permissions";

export const baseConfig = {
  appName: "Atelier",
  plugins: [
    admin({ ac, roles }),
    organization(),
    passkey(),
    oneTap(),
    lastLoginMethod(),
    i18n({
      translations: { en: locales.en, es: locales.es },
      defaultLocale: "es",
      detection: ["header", "cookie"],
    }),
  ],
  emailAndPassword: { enabled: true },
  trustedOrigins: ["https://*.davbrito.workers.dev"],
  telemetry: {
    enabled: false,
  },
} satisfies BetterAuthOptions;
