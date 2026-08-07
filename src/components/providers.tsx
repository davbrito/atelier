import { oneTapPlugin } from "@better-auth-ui/react/plugins";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authLocalization, organizationLocalization, passkeyLocalization } from "#/i18n/auth";
import { adminPlugin } from "#/lib/auth/admin-plugin.ts";
import { authClient } from "#/lib/auth/client";
import { organizationPlugin } from "#/lib/auth/organization-plugin";
import { passkeyPlugin } from "#/lib/auth/passkey-plugin";
import { avatarConfig } from "#/lib/avatar-upload";
import { AuthProvider } from "./auth/auth-provider";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient}
      redirectTo="/app"
      socialProviders={["google"]}
      emailAndPassword={{ requireEmailVerification: false }}
      avatar={avatarConfig}
      navigate={navigate}
      plugins={[
        passkeyPlugin({ localization: passkeyLocalization }),
        organizationPlugin({ localization: organizationLocalization }),
        oneTapPlugin(),
        adminPlugin(),
      ]}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
      localization={authLocalization}
    >
      {children}
      <Toaster />
    </AuthProvider>
  );
}
