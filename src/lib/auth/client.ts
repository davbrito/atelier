import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  lastLoginMethodClient,
  oneTapClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    organizationClient(),
    passkeyClient(),
    oneTapClient({ clientId: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID }),
    lastLoginMethodClient(),
  ],
});

declare module "@better-auth-ui/core" {
  interface AuthConfig {
    authClient: typeof authClient;
  }
}
