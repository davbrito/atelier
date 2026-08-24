import type { OrganizationAuthClient } from "@better-auth-ui/core/plugins/organization";
import { useAuth } from "@better-auth-ui/react";
import { useActiveOrganization } from "@better-auth-ui/react/plugins/organization";
import { createFileRoute, Navigate, Outlet, redirect } from "@tanstack/react-router";
import type { Organization } from "better-auth/plugins";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_app/app/_workspace")({
  component: RouteComponent,
  async beforeLoad({ context }) {
    const { session } = context;

    if (!session.session.activeOrganizationId) {
      throw redirect({ to: "/app/onboarding" });
    }
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center p-6">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

function RouteComponent() {
  const { authClient } = useAuth<OrganizationAuthClient>();

  const { data: active, isFetching, isPending } = useActiveOrganization(authClient);
  useReloadOnOrganizationChange(active, isFetching);

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!active) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <Outlet />;
}

// Server data (budgets, materials, clients, etc.) is scoped to the active
// organization via the session cookie. `useActiveOrganization` optimistically
// writes the new organization into its query data the instant the switch
// mutation starts (onMutate), well before the server has actually updated
// the session cookie — reacting to that id change immediately reloads too
// early and re-fetches everything against the still-stale cookie. Waiting
// for `isFetching` to settle back to false means the query has resolved
// against the server, so the cookie is authoritative by the time we reload.
function useReloadOnOrganizationChange(
  activeOrganization: Organization | null | undefined,
  isFetching: boolean,
) {
  const settledOrgId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (isFetching) return;

    const currentOrgId = activeOrganization?.id ?? null;
    if (settledOrgId.current !== undefined && settledOrgId.current !== currentOrgId) {
      window.location.reload();
      return;
    }
    settledOrgId.current = currentOrgId;
  }, [activeOrganization?.id, isFetching]);
}
