import { createFileRoute, redirect } from "@tanstack/react-router";
import { Organization } from "#/components/auth/organization/organization";
import { ensureSession } from "#/lib/auth/functions";
import { organizationPlugin } from "#/lib/auth/organization-plugin";

const validOrganizationPaths = Object.values(organizationPlugin().viewPaths.organization);

export const Route = createFileRoute("/_app/organization/$path")({
  params: {
    parse: ({ path }) => {
      if (!validOrganizationPaths.includes(path)) return false;
      return { path };
    },
  },
  async beforeLoad({ context: { queryClient }, location }) {
    const session = await ensureSession(queryClient);

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: "sign-in" },
        search: { redirectTo: location.href },
      });
    }

    return { session };
  },
  component: OrganizationPage,
});

function OrganizationPage() {
  const { path } = Route.useParams();

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <Organization path={path} />
    </div>
  );
}
