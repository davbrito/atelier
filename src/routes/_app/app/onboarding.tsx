import {
  type OrganizationAuthClient,
  organizationMutationKeys,
} from "@better-auth-ui/core/plugins/organization";
import { useAuth } from "@better-auth-ui/react";
import { useActiveOrganization } from "@better-auth-ui/react/plugins/organization";
import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query";
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

  const { authClient } = useAuth<OrganizationAuthClient>();
  // useSetActiveOrganization updates this query's cache optimistically in
  // onMutate, before the set-active request actually reaches the server.
  // Gate the redirect on isFetching too, so we don't navigate to the
  // workspace (whose server functions require an active organization)
  // until the query has actually settled with a fetch.
  const { data: active, isFetching } = useActiveOrganization(authClient);
  const isMutating = useIsMutating({
    mutationKey: organizationMutationKeys.setActive,
  });

  if (active && !isFetching && !isMutating) {
    return <Navigate to="/app" replace />;
  }

  return <OrganizationOnboarding count={count} />;
}
