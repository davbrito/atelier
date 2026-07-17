import { type OrganizationAuthClient, useActiveOrganization, useAuth } from "@better-auth-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet, redirect } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { ensureActiveOrganization } from "#/lib/auth/functions";
import { queryKeys } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace")({
  component: RouteComponent,
  async beforeLoad({ context }) {
    const { queryClient, session } = context;
    const organization = await ensureActiveOrganization(queryClient, session.user.id);

    if (!session.session.activeOrganizationId || !organization) {
      throw redirect({ to: "/app/onboarding" });
    }

    return { organization: organization as typeof organization | null };
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center p-6">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

// react-query cache keys don't include the active organization id, so cached
// data (budgets, materials, operations, dashboard, individual budget details)
// would still be served from the previous org after switching. Clearing them
// on org change forces a refetch scoped to the new org.
const PER_ORG_KEYS = [
  queryKeys.budgets,
  queryKeys.materials,
  queryKeys.operations,
  queryKeys.dashboard,
  ["budget"],
];

function RouteComponent() {
  const { authClient } = useAuth();
  const queryClient = useQueryClient();

  const { data: active } = useActiveOrganization(authClient as OrganizationAuthClient);

  const previousOrgId = useRef(active?.id);
  useEffect(() => {
    if (active?.id && previousOrgId.current && active.id !== previousOrgId.current) {
      for (const key of PER_ORG_KEYS) {
        queryClient.removeQueries({ queryKey: key });
      }
    }
    previousOrgId.current = active?.id;
  }, [active?.id, queryClient]);

  if (!active) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <Outlet />;
}
