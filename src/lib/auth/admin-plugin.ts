import { createAuthPlugin } from "@better-auth-ui/core";
import {
  type AdminPluginOptions,
  adminPlugin as coreAdminPlugin,
} from "@better-auth-ui/core/plugins/admin";
import { StopImpersonating } from "#/components/auth/admin/stop-impersonating.tsx";
import { AdminLink } from "#/lib/auth-custom/components/admin-link.tsx";

export const adminPlugin = createAuthPlugin(
  coreAdminPlugin.id,
  (options: AdminPluginOptions = {}) => ({
    ...coreAdminPlugin(options),
    userMenuItems: [AdminLink, StopImpersonating],
  }),
);
