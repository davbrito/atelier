import { type OrganizationAuthClient, useActiveOrganization, useAuth } from "@better-auth-ui/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OrganizationOnboarding } from "#/components/organization-onboarding";
import { ensureOrganizationList } from "#/lib/auth/functions";
import { userOrganizationCountQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/onboarding")({
  component: RouteComponent,
  loader: async ({ context: { queryClient, session } }) => {
    await Promise.all([
      queryClient.prefetchQuery(userOrganizationCountQueryOptions),
      ensureOrganizationList(queryClient, session.user.id),
    ]);
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

function RouteComponent() {
  const { data: count = 0 } = useSuspenseQuery(userOrganizationCountQueryOptions);

  const { authClient } = useAuth();
  const { data: active } = useActiveOrganization(authClient as OrganizationAuthClient);

  if (active) {
    return <Navigate to="/app" replace />;
  }

  return <OrganizationOnboarding count={count} />;
}
