import { viewPaths } from "@better-auth-ui/core";
import type { AdminAuthClient } from "@better-auth-ui/core/plugins/admin";
import { useAuth, useSession } from "@better-auth-ui/react";
import { ShieldIcon } from "lucide-react";

import { DropdownMenuItem } from "#/components/ui/dropdown-menu.tsx";

export type AdminLinkProps = {
  className?: string;
};

/** Links administrators to the administration shell from the user menu. */
export function AdminLink({ className }: AdminLinkProps) {
  const { authClient, basePaths, navigate } = useAuth<AdminAuthClient>();
  const { data: session } = useSession(authClient);

  if (session?.user.role !== "admin") {
    return null;
  }

  return (
    <DropdownMenuItem
      className={className}
      onClick={() => navigate({ to: `${basePaths.admin}/${viewPaths.admin.users}` })}
    >
      <ShieldIcon className="text-muted-foreground" />
      Administración
    </DropdownMenuItem>
  );
}
