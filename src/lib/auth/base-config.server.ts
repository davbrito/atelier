import { passkey } from "@better-auth/passkey";
import type { BetterAuthOptions } from "better-auth";
import { admin, lastLoginMethod, oneTap, organization } from "better-auth/plugins";
import { ac, roles } from "./permissions";

export const baseConfig = {
  appName: "Atelier",
  plugins: [admin({ ac, roles }), organization(), passkey(), oneTap(), lastLoginMethod()],
  emailAndPassword: { enabled: true },
  trustedOrigins: ["https://*.davbrito.workers.dev"],
  telemetry: {
    enabled: false,
  },
} satisfies BetterAuthOptions;
