import { createAuthPlugin } from "@better-auth-ui/core";

import { AdminWhitelist } from "#/lib/auth-custom/components/admin-whitelist.tsx";

export const whitelistPlugin = createAuthPlugin("whitelist", () => ({
  adminTabs: [
    {
      id: "whitelist",
      path: "whitelist",
      label: "Usuarios permitidos",
      component: AdminWhitelist,
    },
  ],
}));
