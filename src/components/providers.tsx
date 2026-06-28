import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { authLocalization, organizationLocalization, passkeyLocalization } from "#/i18n/auth";
import { authClient } from "#/lib/auth/client";
import { organizationPlugin } from "#/lib/auth/organization-plugin";
import { passkeyPlugin } from "#/lib/auth/passkey-plugin";
import { AuthProvider } from "./auth/auth-provider";
import { Toaster } from "./ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthProvider
      authClient={authClient as any}
      redirectTo="/app"
      socialProviders={["google"]}
      emailAndPassword={{ requireEmailVerification: false }}
      navigate={navigate}
      plugins={[
        passkeyPlugin({ localization: passkeyLocalization }),
        organizationPlugin({ localization: organizationLocalization }),
      ]}
      Link={({ href, ...props }) => <Link to={href} {...props} />}
      localization={authLocalization}
    >
      {children}
      <Toaster />
    </AuthProvider>
  );
}
