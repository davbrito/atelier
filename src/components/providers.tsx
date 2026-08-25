import { oneTapPlugin } from "@better-auth-ui/react/plugins/one-tap";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { esES } from "#/i18n/auth";
import { adminPlugin } from "#/lib/auth/admin-plugin.ts";
import { authClient } from "#/lib/auth/client";
import { organizationPlugin } from "#/lib/auth/organization-plugin";
import { passkeyPlugin } from "#/lib/auth/passkey-plugin";
import { avatarConfig } from "#/lib/avatar-upload";
import { AuthProvider } from "./auth/auth-provider";
import { Toaster } from "./ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      redirectTo="/app"
      socialProviders={["google"]}
      emailAndPassword={{ requireEmailVerification: false }}
      avatar={avatarConfig}
      basePaths={{ settings: "/app/settings" }}
      navigate={navigate}
      plugins={[passkeyPlugin(), organizationPlugin(), oneTapPlugin(), adminPlugin()]}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
      locale={esES}
    >
      {children}
      <Toaster />
    </AuthProvider>
  );
}
