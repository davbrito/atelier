import { type OrganizationAuthClient, useActiveOrganization, useAuth } from "@better-auth-ui/react";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { ensureActiveOrganization } from "#/lib/auth/functions";

export const Route = createFileRoute("/_app/app/_workspace")({
  component: RouteComponent,
  async beforeLoad({ context }) {
    const { queryClient, session } = context;
    const organization = await ensureActiveOrganization(queryClient, session.user.id);

    if (!organization) {
      throw Route.redirect({ to: "/app/onboarding" });
    }

    return { organization: organization as typeof organization | null };
  },
});

function RouteComponent() {
  const { authClient } = useAuth();

  const { data: active } = useActiveOrganization(authClient as OrganizationAuthClient);

  if (!active) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <Outlet />;
}
