import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Settings } from "#/components/auth/settings/settings";
import { ensureSession } from "#/lib/auth/functions";
import { organizationPlugin } from "#/lib/auth/organization-plugin";

const validSettingsPaths = [
  ...Object.values(viewPaths.settings),
  ...Object.values(organizationPlugin().viewPaths.settings),
];

export const Route = createFileRoute("/_app/settings/$path")({
  params: {
    parse: ({ path }) => {
      if (!validSettingsPaths.includes(path)) return false;
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
  component: SettingsPage,
});

function SettingsPage() {
  const { path } = Route.useParams();

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <Settings path={path} />
    </div>
  );
}
